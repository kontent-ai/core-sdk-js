import type { ZodMiniType } from "zod/mini";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { createSdkError } from "../../utils/error.utils.js";
import { type TryCatchResult, tryCatch } from "../../utils/try-catch.utils.js";
import type { QueryResponse, SafeQueryResult, SdkConfig } from "../sdk-models.js";
import { parseResponse } from "../sdk-utils.js";

type TransformResponseFn<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra> = (
	response: QueryResponse<TPayload, TMeta, TExtra>,
) => Promise<TryCatchResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>>;

type BatchTransformResponsesFn<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra> = (
	responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
) => Promise<TryCatchResult<readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[], TError>>;

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

export function createTransformResponse<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra>({
	config,
	transform,
	transformSchema,
	mapError,
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transform: (response: QueryResponse<TPayload, TMeta, TExtra>) => QueryResponse<TTransformedPayload, TMeta, TExtra>;
	readonly transformSchema: () => Promise<ZodMiniType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra> {
	return async (response) => {
		const { success, data: transformedResponse, error } = tryCatch(() => transform(response));

		if (!success) {
			return { success: false, error: mapError(createTransformError(error, response.meta.url)) };
		}

		if (config.runtimeValidation?.validateResponses) {
			const validationError = await parseResponse({
				url: transformedResponse.meta.url,
				payload: transformedResponse.payload,
				schema: await transformSchema(),
			});

			if (validationError) {
				return { success: false, error: mapError(validationError.error) };
			}
		}

		return { success: true, data: transformedResponse };
	};
}

export function createBatchTransformResponses<TPayload extends JsonValue, TTransformedPayload extends TPayload, TError, TMeta, TExtra>({
	config,
	transform,
	transformSchema,
	mapError,
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transform: (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	) => readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[];
	readonly transformSchema: () => Promise<ZodMiniType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): BatchTransformResponsesFn<TPayload, TTransformedPayload, TError, TMeta, TExtra> {
	return async (responses) => {
		const firstResponse = responses?.[0];
		if (!firstResponse) {
			return { success: true, data: [] };
		}

		const { success, data: transformedResponses, error } = tryCatch(() => transform(responses));

		if (!success) {
			return { success: false, error: mapError(createTransformError(error, firstResponse.meta.url)) };
		}

		if (config.runtimeValidation?.validateResponses) {
			const schema = await transformSchema();
			for (const transformedResponse of transformedResponses) {
				const validationError = await parseResponse({
					url: transformedResponse.meta.url,
					payload: transformedResponse.payload,
					schema,
				});

				if (validationError) {
					return { success: false, error: mapError(validationError.error) };
				}
			}
		}

		return { success: true, data: transformedResponses };
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
