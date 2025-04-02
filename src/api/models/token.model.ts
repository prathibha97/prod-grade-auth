import mongoose, { Schema } from "mongoose";
import { RefreshTokenDocument, ResetTokenDocument, VerifyEmailTokenDocument } from "../../types/auth";

// Refresh Token Schema
const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Password Reset Token Schema
const resetTokenSchema = new Schema<ResetTokenDocument>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Email Verification Token Schema
const verifyEmailTokenSchema = new Schema<VerifyEmailTokenDocument>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    expires: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Login Attempts Schema
const loginAttemptSchema = new Schema({
  ipAddress: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  successful: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Multi-Factor Authentication Schema
const mfaTokenSchema = new Schema({
  userId: {
    type: String,
    ref: "User",
    required: true,
    unique: true,
  },
  secret: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  backupCodes: [
    {
      type: String,
    },
  ],
});

// Create models
export const RefreshToken = mongoose.model<RefreshTokenDocument>("RefreshToken", refreshTokenSchema);
export const ResetToken = mongoose.model<ResetTokenDocument>("ResetToken", resetTokenSchema);
export const VerifyEmailToken = mongoose.model<VerifyEmailTokenDocument>("VerifyEmailToken", verifyEmailTokenSchema);
export const LoginAttempt = mongoose.model("LoginAttempt", loginAttemptSchema);
export const MfaToken = mongoose.model("MfaToken", mfaTokenSchema);
