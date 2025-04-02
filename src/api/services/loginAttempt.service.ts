import { LoginAttempt } from "../models/token.model";
import User from "../models/user.model";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

// Record login attempt
export const recordLoginAttempt = async (email: string, ipAddress: string, successful: boolean): Promise<void> => {
  await LoginAttempt.create({
    email,
    ipAddress,
    successful,
    timestamp: new Date(),
  });

  if (!successful) {
    // Increment failed login attempts
    const user = await User.findOne({ email });
    if (user) {
      user.failedLoginAttempts += 1;
      user.lastFailedLogin = new Date();

      // Lock account if max attempts reached
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.accountLocked = true;
        user.accountLockedUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
      }

      await user.save();
    }
  } else {
    // Reset failed login attempts on successful login
    await User.updateOne(
      { email },
      {
        failedLoginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
      },
    );
  }
};

// Check if too many failed attempts
export const checkTooManyFailedAttempts = async (email: string, ipAddress: string): Promise<boolean> => {
  // Check user-specific lock first
  const user = await User.findOne({ email });
  if (user && user.accountLocked) {
    // Check if lock time has expired
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      return true;
    } else if (user.accountLockedUntil) {
      // Unlock account if lock time expired
      user.accountLocked = false;
      user.accountLockedUntil = undefined;
      user.failedLoginAttempts = 0;
      await user.save();
    }
  }

  // Check IP-based rate limiting
  const timeWindowStart = new Date(Date.now() - 60 * 60 * 1000); // Last hour
  const recentFailedAttempts = await LoginAttempt.countDocuments({
    ipAddress,
    successful: false,
    timestamp: { $gte: timeWindowStart },
  });

  return recentFailedAttempts >= 10; // IP-based rate limit
};
