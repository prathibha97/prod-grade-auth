import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { ApiResponse } from "../../utils/apiResponse";

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate the request body against the given schema.
 *
 * If the validation fails, this middleware returns a 400 error response with
 * a structured object containing the validation errors.
 *
 * @param {Joi.ObjectSchema} schema - The Joi schema to validate the request body against
 * @returns {function(Request, Response, NextFunction)} - The middleware function
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      // Format validation errors into a structured object
      const errors: ValidationError[] = error.details.map((detail) => {
        // Extract field name from the path
        const field = detail.path.join(".");

        // Clean up the message (remove quotes and field references)
        let message = detail.message.replace(/"/g, "");
        message = message.replace(/\[\d+\]/g, ""); // Replace array indices

        return { field, message };
      });

      return ApiResponse.error(res, {
        message: "Validation failed",
        code: 400,
        data: { errors },
      });
    }

    next();
  };
};
