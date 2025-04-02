import config from "../../config/environment";
import crypto from "crypto";
import QRCode from "qrcode";
import speakeasy from "speakeasy";
import { IUser } from "../../types/user";
import { MfaToken } from "../models/token.model";
import bcrypt from "bcryptjs";
import User from "../models/user.model";

// Generate MFA secret
export const generateMfaSecret = (user: IUser) => {
  const secret = speakeasy.generateSecret({
    name: `${config.appName}:${user.email}`,
  });

  return secret;
};

// Generate QR code for MFA
export const generateQrCode = async (otpAuthUrl: string): Promise<string> => {
  return QRCode.toDataURL(otpAuthUrl);
};

// Save MFA secret for user
export const saveMfaSecret = async (userId: string, secret: string): Promise<void> => {
  // Generate backup codes
  const backupCodes = Array(10)
    .fill(0)
    .map(() => crypto.randomBytes(4).toString("hex"));

  // Save or update
  await MfaToken.findOneAndUpdate(
    { userId },
    {
      userId,
      secret,
      verified: false,
      backupCodes: backupCodes.map((code) => bcrypt.hashSync(code, 10)),
    },
    { upsert: true, new: true },
  );
};

// Verify MFA token
export const verifyMfaToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
  });
};

// Verify backup code
export const verifyBackupCode = async (userId: string, code: string): Promise<boolean> => {
  const mfaToken = await MfaToken.findOne({ userId });

  if (!mfaToken) return false;

  // Find matching backup code
  const index = mfaToken.backupCodes.findIndex((hashedCode) => bcrypt.compareSync(code, hashedCode));

  if (index === -1) return false;

  // Remove used backup code
  mfaToken.backupCodes.splice(index, 1);
  await mfaToken.save();

  return true;
};

// Get MFA secret for user
export const getMfaSecret = async (userId: string): Promise<string | null> => {
  const mfaToken = await MfaToken.findOne({ userId });
  return mfaToken ? mfaToken.secret : null;
};

// Get backup codes
export const getBackupCodes = async (userId: string): Promise<string[]> => {
  // Generate new backup codes
  const backupCodes = Array(10)
    .fill(0)
    .map(() => crypto.randomBytes(4).toString("hex"));

  // Update with new hashed backup codes
  await MfaToken.findOneAndUpdate(
    { userId },
    {
      backupCodes: backupCodes.map((code) => bcrypt.hashSync(code, 10)),
    },
  );

  return backupCodes;
};

// Mark MFA as verified
export const verifyMfaSetup = async (userId: string): Promise<void> => {
  await MfaToken.updateOne({ userId }, { verified: true });
  await User.updateOne({ _id: userId }, { mfaEnabled: true });
};
