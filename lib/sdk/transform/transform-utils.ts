import type { SafeHttpResult } from "../../http/http.models.js";
import { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import { type TryCatchResult, tryCatch, unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { QueryResponse, SdkConfig } from "../sdk-models.js";
import { validatePayloads } from "../sdk-utils.js";

const emptyTransformResultMessage = "Transform returned no response for input";

type TransformBaseOptions<TTransformedPayload extends JsonValue, TError extends KontentSdkError> = {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
};

/**
 * Options of a transform applied to a single query response (fetch / mutation queries).
 */
export type TransformOptions<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
> = TransformBaseOptions<TTransformedPayload, TError> & {
	readonly transform: (response: QueryResponse<TPayload, TMeta, TExtra>) => QueryResponse<TTransformedPayload, TMeta, TExtra>;
};

/**
 * Options of a transform applied to a batch of query responses (paged queries), so that the transform can
 * resolve data across all pages at once.
 */
export type BatchTransformOptions<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
> = TransformBaseOptions<TTransformedPayload, TError> & {
	readonly transform: (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	) => readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[];
};

type TransformResponseFn<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
> = (
	response: QueryResponse<TPayload, TMeta, TExtra>,
) => Promise<TryCatchResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>>;

type BatchTransformResponsesFn<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
> = (
	responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
) => Promise<TryCatchResult<readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[], TError>>;

export function createTransformError(error: unknown, url: URL): KontentSdkError {
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

/**
 * Transforms the responses in a single call and validates the transformed payloads against `transformSchema`.
 */
export function transformBatchResponses<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	config,
	transform,
	transformSchema,
	mapError,
}: BatchTransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra>): BatchTransformResponsesFn<
	TPayload,
	TTransformedPayload,
	TError,
	TMeta,
	TExtra
> {
	return async (responses) => {
		const firstResponse = responses[0];

		if (!firstResponse) {
			return { success: true, data: [] };
		}

		const { success, data, error } = tryCatch(() => transform(responses));

		if (!success) {
			return { success: false, error: mapError(createTransformError(error, firstResponse.meta.url)) };
		}

		const validationError = await validateTransformedResponses({ config, transformSchema, mapError, responses: data });
		if (validationError) {
			return { success: false, error: validationError };
		}

		return { success: true, data };
	};
}

/**
 * Transforms a single response and validates the transformed payload against `transformSchema`.
 */
export function transformSingleResponse<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	transform,
	...options
}: TransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra>): TransformResponseFn<
	TPayload,
	TTransformedPayload,
	TError,
	TMeta,
	TExtra
> {
	return toSingleTransform({
		batchTransform: transformBatchResponses({ ...options, transform: (responses) => responses.map(transform) }),
		mapError: options.mapError,
	});
}

/**
 * Validates the transformed payloads against `transformSchema`, returning the mapped error of the first mismatch.
 */
async function validateTransformedResponses<TTransformedPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra>({
	config,
	transformSchema,
	mapError,
	responses,
}: TransformBaseOptions<TTransformedPayload, TError> & {
	readonly responses: readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[];
}): Promise<TError | undefined> {
	const validationError = await validatePayloads({
		runtimeValidation: config.runtimeValidation,
		schema: transformSchema,
		payloads: responses.map(({ meta, payload }) => ({ url: meta.url, payload })),
	});

	return validationError ? mapError(validationError) : undefined;
}

/**
 * Applies a batch transform to a single response. Fails when the transform returns no response for it.
 */
export function toSingleTransform<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	batchTransform,
	mapError,
}: {
	readonly batchTransform: BatchTransformResponsesFn<TPayload, TTransformedPayload, TError, TMeta, TExtra>;
	readonly mapError: (error: KontentSdkError) => TError;
}): TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra> {
	return async (response) => {
		const result = await batchTransform([response]);
		if (!result.success) {
			return result;
		}

		const [first] = result.data;
		return first
			? { success: true, data: first }
			: { success: false, error: mapError(createTransformError(new Error(emptyTransformResultMessage), response.meta.url)) };
	};
}

/**
 * Creates the safe & throwing query methods that transform the response of a single-response query.
 */
export function createSafeAndUnsafeWithTransform<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	querySafe,
	transformResponse,
}: {
	readonly querySafe: () => Promise<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	readonly transformResponse: TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra>;
}): {
	readonly safe: () => Promise<SafeHttpResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>>;
	readonly unsafe: () => Promise<QueryResponse<TTransformedPayload, TMeta, TExtra>>;
} {
	const safe = async () => await applyTransformSafely(await querySafe(), transformResponse);

	return {
		safe,
		unsafe: async () => unwrapOrThrow(await safe()).response,
	};
}

export async function applyTransformSafely<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>(
	safeResult: SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>,
	transformResponse: TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra>,
): Promise<SafeHttpResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> {
	if (!safeResult.success) {
		return safeResult;
	}

	const { success, data, error } = await transformResponse(safeResult.response);
	if (!success) {
		return { success: false, error };
	}
	return { success: true, response: data };
}
