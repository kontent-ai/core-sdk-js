import type { ZodType } from "zod";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { createSdkError } from "../../utils/error.utils.js";
import { type TryCatchResult, tryCatch } from "../../utils/try-catch.utils.js";
import type { QueryResponse, SafeQueryResult, SdkConfig } from "../sdk-models.js";
import { parseResponse } from "../sdk-utils.js";

export function createTransformError(error: unknown, url: URL): KontentSdkError {
	return createSdkError({
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

export type TransformResponseFn<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra> = (
	response: QueryResponse<TPayload, TMeta, TExtra>,
) => Promise<TryCatchResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>>;

export function createTransformResponse<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra>({
	config,
	transform,
	transformSchema,
	mapError,
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transform: (payload: TPayload) => TTransformedPayload;
	readonly transformSchema: () => Promise<ZodType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra> {
	return async (response) => {
		const { success, data: transformedPayload, error } = tryCatch(() => transform(response.payload));

		if (!success) {
			return { success: false, error: mapError(createTransformError(error, response.meta.url)) };
		}

		if (config.runtimeValidation?.validateResponses) {
			const validationError = await parseResponse({
				url: response.meta.url,
				payload: transformedPayload,
				zodSchema: await transformSchema(),
			});

			if (validationError) {
				return { success: false, error: mapError(validationError.error) };
			}
		}

		return { success: true, data: { ...response, payload: transformedPayload } };
	};
}

export async function applyTransformOrThrow<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra>(
	response: QueryResponse<TPayload, TMeta, TExtra>,
	transformResponse: TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra>,
): Promise<QueryResponse<TTransformedPayload, TMeta, TExtra>> {
	const { success, data, error } = await transformResponse(response);
	if (!success) {
		throw error;
	}
	return data;
}

export async function applyTransformSafely<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra>(
	safeResult: SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>,
	transformResponse: TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra>,
): Promise<SafeQueryResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> {
	if (!safeResult.success) {
		return { success: false, error: safeResult.error };
	}

	const { success, data, error } = await transformResponse(safeResult.response);
	if (!success) {
		return { success: false, error };
	}
	return { success: true, response: data };
}
