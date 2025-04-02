import express from "express";
import Joi from "joi";
import { validate } from "../middleware/validator";
import * as authController from "../controllers/auth.controller";
import { protect, restrictTo, requireMfa } from "../middleware/auth";

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().email().required(),
  password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
    .message("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
    .message("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

const verifyMfaSchema = Joi.object({
  tempToken: Joi.string().required(),
  mfaToken: Joi.string().required(),
  useBackupCode: Joi.boolean().default(false),
});

const verifyMfaSetupSchema = Joi.object({
  token: Joi.string().required(),
});

const disableMfaSchema = Joi.object({
  token: Joi.string().required(),
  useBackupCode: Joi.boolean().default(false),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
    .message("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
    .disallow(Joi.ref("currentPassword"))
    .messages({
      "any.invalid": "New password must be different from current password",
    }),
});

// Public routes
router.post("/register", validate(registerSchema), authController.registerUser);
router.post("/login", validate(loginSchema), authController.loginUser);
router.post("/verify-mfa", validate(verifyMfaSchema), authController.verifyMfa);
router.post("/refresh-token", validate(refreshTokenSchema), authController.refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);

// Protected routes
router.use(protect);

router.post("/logout", validate(refreshTokenSchema), authController.logoutUser);
router.get("/session", authController.getSession);
router.post("/change-password", validate(changePasswordSchema), authController.changePassword);

// MFA routes
router.post("/mfa/setup", authController.setupMfa);
router.post("/mfa/verify", validate(verifyMfaSetupSchema), authController.verifyMfaSetup);
router.post("/mfa/disable", validate(disableMfaSchema), authController.disableMfa);

// Admin routes
router.use("/admin", restrictTo("admin"), (req, res) => {
  res.json({ message: "Admin route" });
});

export default router;
