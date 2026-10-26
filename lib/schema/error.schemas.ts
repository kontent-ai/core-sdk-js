import * as z from "@zod/mini";
import type { ErrorResponseData, ValidationError } from "../models/error.models.js";

export const validationErrorSchema = z.readonly(
	z.object({
		message: z.string(),
		path: z.optional(z.string()),
		line: z.optional(z.number()),
		position: z.optional(z.number()),
	}),
) satisfies z.ZodMiniType<ValidationError>;

export const errorResponseDataSchema = z.readonly(
	z.object({
		message: z.string(),
		request_id: z.string(),
		error_code: z.number(),
		validation_errors: z.optional(z.readonly(z.array(validationErrorSchema))),
	}),
) satisfies z.ZodMiniType<ErrorResponseData>;
