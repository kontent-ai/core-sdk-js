import type { SafeHttpResult } from "../../http/http.models.js";
import { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { type TryCatchResult, tryCatch } from "../../utils/try-catch.utils.js";
import type { QueryResponse } from "../sdk-models.js";
import { validatePayloads } from "../sdk-utils.js";
import type { PagedTransformOptions, TransformBaseOptions, TransformOptions } from "./transform.models.js";

/**
 * Transforms the result of a single query call (e.g. `fetchSafe`) and validates the transformed payload against `transformSchema`.
 * A failed result is returned as is.
 */
export async function transformSafeResult<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>(
	options: TransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra>,
	safeResult: SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>,
): Promise<SafeHttpResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> {
	if (!safeResult.success) {
		return safeResult;
	}

	const { success, data, error } = tryCatch(() => options.transform(safeResult.response));

	if (!success) {
		return { success: false, error: options.mapError(createTransformError(error, safeResult.response.meta.url)) };
	}

	const validationError = await validateTransformedResponses(options, [data]);

	return validationError ? { success: false, error: validationError } : { success: true, response: data };
}

/**
 * Transforms an array of responses in a single `transform` call and validates the transformed payloads against `transformSchema`.
 */
export async function transformResponses<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>(
	options: PagedTransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra>,
	responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
): Promise<TryCatchResult<readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[], TError>> {
	const firstResponse = responses[0];

	if (!firstResponse) {
		return { success: true, data: [] };
	}

	const { success, data, error } = tryCatch(() => options.transform(responses));

	if (!success) {
		return { success: false, error: options.mapError(createTransformError(error, firstResponse.meta.url)) };
	}

	const validationError = await validateTransformedResponses(options, data);

	return validationError ? { success: false, error: validationError } : { success: true, data };
}

/**
 * Validates the transformed payloads against `transformSchema`, returning the mapped error of the first mismatch.
 */
async function validateTransformedResponses<TTransformedPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra>(
	{ config, transformSchema, mapError }: TransformBaseOptions<TTransformedPayload, TError>,
	responses: readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[],
): Promise<TError | undefined> {
	const validationError = await validatePayloads({
		runtimeValidation: config.runtimeValidation,
		schema: transformSchema,
		payloads: responses.map(({ meta, payload }) => ({ url: meta.url, payload })),
	});

	return validationError ? mapError(validationError) : undefined;
}

function createTransformError(error: unknown, url: URL): KontentSdkError {
	return new KontentSdkError({
		baseErrorData: {
			message: `Failed to transform payload for url ${url.toString()}`,
			url: url.toString(),
			retryAttempt: undefined,
			retryStrategyOptions: undefined,
		},
		details: {
			originalError: error,
			reason: "transformError",
		},
	});
}
