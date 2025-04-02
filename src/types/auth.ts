export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  type: "access" | "refresh" | "reset" | "verify";
  iat?: number;
  exp?: number;
}

export interface RefreshTokenDocument {
  userId: string;
  token: string;
  expires: Date;
  blacklisted: boolean;
}

export interface ResetTokenDocument {
  userId: string;
  token: string;
  expires: Date;
  used: boolean;
}

export interface VerifyEmailTokenDocument {
  userId: string;
  token: string;
  expires: Date;
}

export interface MfaTokenDocument {
  userId: string;
  secret: string;
  verified: boolean;
  backupCodes: string[];
}

export interface LoginAttemptDocument {
  ipAddress: string;
  email: string;
  successful: boolean;
  timestamp: Date;
}
