import { Request, Response } from "express";
import { IUser } from "../../types/user";
import { ApiResponse } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import User from "../models/user.model";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  // User is already attached to req from the auth middleware
  const user = req.user as IUser;

  return ApiResponse.success(res, {
    message: "User profile retrieved successfully",
    data: {
      user,
    },
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as IUser)._id;
  const { name } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { name },
    {
      new: true,
      runValidators: true,
    },
  );

  return ApiResponse.success(res, {
    message: "Profile updated successfully",
    data: {
      user,
    },
  });
});
