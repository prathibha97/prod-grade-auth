import jwt from "jsonwebtoken";
import crypto from "crypto";
import moment from "moment";
import { TokenPayload } from "../../types/auth";
import config from "../../config/environment";
import { RefreshToken, ResetToken, VerifyEmailToken } from "../models/token.model";
import { IUser } from "../../types/user";

// Generate token
export const generateToken = (user: IUser, type: "access" | "refresh" | "reset" | "verify", expiresIn?: string | number): string => {
  const payload: TokenPayload = {
    id: user._id?.toString() || "", // Safely convert _id to string
    email: user.email,
    role: user.role,
    type,
  };

  let secret: string;
  let defaultExpiry: string | number;

  // Determine the correct secret and expiry based on token type
  switch (type) {
    case "access":
      secret = config.jwtAccessSecret.toString();
      defaultExpiry = config.jwtAccessExpiresIn || "15m";
      break;
    case "refresh":
      secret = config.jwtRefreshSecret.toString();
      defaultExpiry = config.jwtRefreshExpiresIn || "30d";
      break;
    case "reset":
    case "verify":
      // For reset and verify tokens, use the access token secret with custom expiry
      secret = config.jwtAccessSecret.toString();
      defaultExpiry = "1h"; // 1 hour for reset/verify tokens
      break;
  }
//@ts-ignore
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn || defaultExpiry,
  });
};

// Verify token
export const verifyToken = (token: string, type: "access" | "refresh" | "reset" | "verify"): Promise<TokenPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, type === "access" ? config.jwtAccessSecret : config.jwtRefreshSecret, (err, decoded) => {
      if (err) return reject(err);

      const payload = decoded as TokenPayload;
      if (payload.type !== type) {
        return reject(new Error("Invalid token type"));
      }

      resolve(payload);
    });
  });
};

// Generate and save refresh token
export const generateRefreshToken = async (user: IUser): Promise<string> => {
  const token = generateToken(user, "refresh");
  const expires = moment().add(parseInt(config.jwtRefreshExpiresInDays, 10), "days").toDate();

  await RefreshToken.create({
    token,
    userId: user._id,
    expires,
    blacklisted: false,
  });

  return token;
};

// Generate random token
export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// Generate and save reset password token
export const generateResetToken = async (user: IUser): Promise<string> => {
  const token = generateRandomToken();
  const expires = moment().add(1, "hours").toDate();

  await ResetToken.create({
    token,
    userId: user._id,
    expires,
    used: false,
  });

  return token;
};

// Generate and save email verification token
export const generateVerifyEmailToken = async (user: IUser): Promise<string> => {
  const token = generateRandomToken();
  const expires = moment().add(24, "hours").toDate();

  await VerifyEmailToken.create({
    token,
    userId: user._id,
    expires,
  });

  return token;
};

// Verify and use reset token
export const verifyResetToken = async (token: string): Promise<string | null> => {
  const resetToken = await ResetToken.findOne({
    token,
    used: false,
    expires: { $gt: new Date() },
  });

  if (!resetToken) return null;

  return resetToken.userId;
};

// Verify email verification token
export const verifyEmailVerificationToken = async (token: string): Promise<string | null> => {
  const verifyToken = await VerifyEmailToken.findOne({
    token,
    expires: { $gt: new Date() },
  });

  if (!verifyToken) return null;

  return verifyToken.userId;
};

// Mark reset token as used
export const useResetToken = async (token: string): Promise<void> => {
  await ResetToken.updateOne({ token }, { used: true });
};

// Blacklist refresh token
export const blacklistToken = async (token: string): Promise<void> => {
  await RefreshToken.updateOne({ token }, { blacklisted: true });
};

// Check if refresh token is blacklisted
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const refreshToken = await RefreshToken.findOne({ token });
  return refreshToken ? refreshToken.blacklisted : true;
};
