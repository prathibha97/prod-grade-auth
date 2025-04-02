import { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin" | "manager";
  isActive: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  accountLocked: boolean;
  accountLockedUntil?: Date;
  passwordLastChanged?: Date;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}