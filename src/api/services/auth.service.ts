import { Document } from "mongoose";
import config from "../../config/environment";
import User from "../models/user.model";
import * as emailService from "./email.service";
import * as loginAttemptService from "./loginAttempt.service";
import * as mfaService from "./mfa.service";
import * as tokenService from "./token.service";

export interface UserDocument extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  lastLogin: Date;
  accountLocked?: boolean;
  accountLockedUntil?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * Register a new user
 */
export async function registerUser(name: string, email: string, password: string) {
  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new Error("User already exists");
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    isEmailVerified: !config.requireEmailVerification,
  });

  // Generate verification token if needed
  if (config.requireEmailVerification) {
    const verificationToken = await tokenService.generateVerifyEmailToken(user);

    // Send verification email
    await emailService.sendEmail({
      to: user.email,
      subject: "Please verify your email",
      template: "verifyEmail",
      data: {
        name: user.name,
        token: verificationToken,
      },
    });
  }

  // Generate tokens
  const accessToken = tokenService.generateToken(user, "access");
  const refreshToken = await tokenService.generateRefreshToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    tokens: {
      access: accessToken,
      refresh: refreshToken,
    },
  };
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string, ipAddress: string) {
  // Check if too many failed attempts
  const tooManyAttempts = await loginAttemptService.checkTooManyFailedAttempts(email, ipAddress);
  if (tooManyAttempts) {
    throw {
      message: "Too many failed attempts. Please try again later.",
      code: 429,
    };
  }

  // Check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    // Record failed login attempt
    await loginAttemptService.recordLoginAttempt(email, ipAddress, false);

    throw {
      message: "Incorrect email or password",
      code: 401,
    };
  }

  // Check if account is locked
  if (user.accountLocked && user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const remainingTimeMs = user.accountLockedUntil.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingTimeMs / (60 * 1000));

    throw {
      message: `Account is locked. Please try again in ${remainingMinutes} minutes.`,
      code: 403,
    };
  }

  // Check if email is verified
  if (config.requireEmailVerification && !user.isEmailVerified) {
    throw {
      message: "Please verify your email before logging in",
      code: 403,
    };
  }

  // Check if MFA is enabled
  if (user.mfaEnabled) {
    // Generate temporary token for MFA verification
    const tempToken = tokenService.generateToken(user, "access", "5m");

    return {
      requireMfa: true,
      tempToken,
    };
  }

  // Record successful login attempt
  await loginAttemptService.recordLoginAttempt(email, ipAddress, true);

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate tokens
  const accessToken = tokenService.generateToken(user, "access");
  const refreshToken = await tokenService.generateRefreshToken(user);

  // Optional: Send login alert email
  if (config.alertOnNewLogin) {
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "New login to your account",
        template: "loginAlert",
        data: {
          name: user.name,
          ipAddress,
          time: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Just log error, don't block login
      console.error("Failed to send login alert email:", error);
    }
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    tokens: {
      access: accessToken,
      refresh: refreshToken,
    },
  };
}

/**
 * Verify MFA token
 */
export async function verifyMfa(tempToken: string, mfaToken: string, useBackupCode: boolean, ipAddress: string) {
  // Verify the temporary token
  const decoded = await tokenService.verifyToken(tempToken, "access");
  const userId = decoded.id;

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  // Get MFA secret
  const secret = await mfaService.getMfaSecret(userId);
  if (!secret) {
    throw {
      message: "MFA not set up for this user",
      code: 400,
    };
  }

  let verified = false;

  if (useBackupCode) {
    // Verify backup code
    verified = await mfaService.verifyBackupCode(userId, mfaToken);
  } else {
    // Verify MFA token
    verified = mfaService.verifyMfaToken(secret, mfaToken);
  }

  if (!verified) {
    throw {
      message: useBackupCode ? "Invalid backup code" : "Invalid MFA token",
      code: 401,
    };
  }

  // Record successful login attempt
  await loginAttemptService.recordLoginAttempt(user.email, ipAddress, true);

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate tokens
  const accessToken = tokenService.generateToken(user, "access");
  const refreshToken = await tokenService.generateRefreshToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    tokens: {
      access: accessToken,
      refresh: refreshToken,
    },
  };
}

/**
 * Logout user
 */
export async function logoutUser(refreshToken: string) {
  if (!refreshToken) {
    throw {
      message: "Refresh token is required",
      code: 400,
    };
  }

  // Blacklist the refresh token
  await tokenService.blacklistToken(refreshToken);
}

/**
 * Refresh token
 */
export async function refreshToken(token: string) {
  if (!token) {
    throw {
      message: "Refresh token is required",
      code: 400,
    };
  }

  // Check if token is blacklisted
  const isBlacklisted = await tokenService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    throw {
      message: "Invalid refresh token",
      code: 401,
    };
  }

  // Verify refresh token
  const decoded = await tokenService.verifyToken(token, "refresh");

  // Find user
  const user = await User.findById(decoded.id);
  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  // Blacklist the old refresh token
  await tokenService.blacklistToken(token);

  // Generate new tokens
  const accessToken = tokenService.generateToken(user, "access");
  const refreshToken = await tokenService.generateRefreshToken(user);

  return {
    tokens: {
      access: accessToken,
      refresh: refreshToken,
    },
  };
}

/**
 * Forgot password
 */
export async function forgotPassword(email: string) {
  // Find user by email
  const user = await User.findOne({ email });

  // Don't reveal whether a user exists for security
  if (!user) {
    return;
  }

  // Generate reset token
  const resetToken = await tokenService.generateResetToken(user);

  // Send password reset email
  await emailService.sendEmail({
    to: user.email,
    subject: "Reset your password",
    template: "resetPassword",
    data: {
      name: user.name,
      token: resetToken,
    },
  });
}

/**
 * Reset password
 */
export async function resetPassword(token: string, password: string) {
  // Verify reset token
  const userId = await tokenService.verifyResetToken(token);

  if (!userId) {
    throw {
      message: "Invalid or expired token",
      code: 400,
    };
  }

  // Find user and update password
  const user = await User.findById(userId);

  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  // Update password
  user.password = password;
  await user.save();

  // Mark token as used
  await tokenService.useResetToken(token);

  try {
    // Send password changed notification
    await emailService.sendEmail({
      to: user.email,
      subject: "Your password has been changed",
      template: "passwordChanged",
      data: {
        name: user.name,
      },
    });
  } catch (error) {
    // Just log the error, don't block the password reset
    console.error("Failed to send password change notification:", error);
  }
}

/**
 * Verify email
 */
export async function verifyEmail(token: string) {
  // Verify email token
  const userId = await tokenService.verifyEmailVerificationToken(token);

  if (!userId) {
    throw {
      message: "Invalid or expired token",
      code: 400,
    };
  }

  // Update user's email verification status
  const user = await User.findById(userId);

  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  if (user.isEmailVerified) {
    return "Email already verified";
  }

  user.isEmailVerified = true;
  await user.save();

  return "Email verified successfully";
}

/**
 * Change password
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  // Find user with password field
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw {
      message: "Current password is incorrect",
      code: 401,
    };
  }

  // Update password
  user.password = newPassword;
  await user.save();

  try {
    // Send password changed notification
    await emailService.sendEmail({
      to: user.email,
      subject: "Your password has been changed",
      template: "passwordChanged",
      data: {
        name: user.name,
      },
    });
  } catch (error) {
    // Just log the error, don't block the password change
    console.error("Failed to send password change notification:", error);
  }
}

/**
 * Setup MFA
 */
export async function setupMfa(userId: string) {
  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  // Check if MFA is already set up
  if (user.mfaEnabled) {
    throw {
      message: "MFA is already enabled for this account",
      code: 400,
    };
  }

  // Generate MFA secret
  const secret = mfaService.generateMfaSecret(user);

  // Save the secret (but not mark as verified yet)
  await mfaService.saveMfaSecret(userId, secret.base32);

  // Generate QR code
  const qrCodeUrl = await mfaService.generateQrCode(secret.otpauth_url as string);

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  };
}

/**
 * Verify MFA setup
 */
export async function verifyMfaSetup(userId: string, token: string) {
  // Get MFA secret
  const secret = await mfaService.getMfaSecret(userId);

  if (!secret) {
    throw {
      message: "MFA setup not initialized",
      code: 400,
    };
  }

  // Verify the token
  const isValid = mfaService.verifyMfaToken(secret, token);

  if (!isValid) {
    throw {
      message: "Invalid verification code",
      code: 400,
    };
  }

  // Mark MFA as verified and enable for the user
  await mfaService.verifyMfaSetup(userId);

  // Generate backup codes
  return await mfaService.getBackupCodes(userId);
}

/**
 * Disable MFA
 */
export async function disableMfa(userId: string, token: string, useBackupCode: boolean) {
  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  // Check if MFA is enabled
  if (!user.mfaEnabled) {
    throw {
      message: "MFA is not enabled for this account",
      code: 400,
    };
  }

  // Get MFA secret
  const secret = await mfaService.getMfaSecret(userId);

  if (!secret) {
    throw {
      message: "MFA setup not found",
      code: 404,
    };
  }

  // Verify the token or backup code
  let verified = false;

  if (useBackupCode) {
    verified = await mfaService.verifyBackupCode(userId, token);
  } else {
    verified = mfaService.verifyMfaToken(secret, token);
  }

  if (!verified) {
    throw {
      message: useBackupCode ? "Invalid backup code" : "Invalid verification code",
      code: 401,
    };
  }

  // Disable MFA for the user
  user.mfaEnabled = false;
  await user.save();
}

/**
 * Get session info
 */
export async function getSession(userId: string) {
  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw {
      message: "User not found",
      code: 404,
    };
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
      lastLogin: user.lastLogin,
    },
  };
}
