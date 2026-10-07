import type { SafeHttpResult } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { isNonEmptyArray as isArrayWithSomeData } from "../../utils/array.utils.js";
import { createSdkError } from "../../utils/error.utils.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import { type TryCatchResult, tryCatch, unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { QueryResponse, SdkConfig } from "../sdk-models.js";
import { validatePayloads } from "../sdk-utils.js";

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

async function transformAndValidate<TResult, TPayload extends JsonValue, TError extends KontentSdkError>({
	config,
	transformSchema,
	mapError,
	errorUrl,
	transform,
	getPayloads,
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transformSchema: SchemaInput<TPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
	readonly errorUrl: URL;
	readonly transform: () => TResult;
	readonly getPayloads: (result: TResult) => readonly { readonly url: URL; readonly payload: TPayload }[];
}): Promise<TryCatchResult<TResult, TError>> {
	const { success, data, error } = tryCatch(transform);

	if (!success) {
		return { success: false, error: mapError(createTransformError(error, errorUrl)) };
	}

	const validationError = await validatePayloads({
		runtimeValidation: config.runtimeValidation,
		schema: transformSchema,
		payloads: getPayloads(data),
	});
	if (validationError) {
		return { success: false, error: mapError(validationError) };
	}

	return { success: true, data };
}

function createTransformResponse<
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
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transform: (response: QueryResponse<TPayload, TMeta, TExtra>) => QueryResponse<TTransformedPayload, TMeta, TExtra>;
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
}): TransformResponseFn<TPayload, TTransformedPayload, TError, TMeta, TExtra> {
	return async (response) =>
		await transformAndValidate({
			config,
			transformSchema,
			mapError,
			errorUrl: response.meta.url,
			transform: () => transform(response),
			getPayloads: (transformed) => [{ url: transformed.meta.url, payload: transformed.payload }],
		});
}

export function createBatchTransformResponses<
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
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transform: (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	) => readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[];
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
}): BatchTransformResponsesFn<TPayload, TTransformedPayload, TError, TMeta, TExtra> {
	return async (responses) => {
		if (!isArrayWithSomeData(responses)) {
			return Promise.resolve({ success: true, data: [] });
		}

		const [firstResponse] = responses;

		return await transformAndValidate({
			config,
			transformSchema,
			mapError,
			errorUrl: firstResponse.meta.url,
			transform: () => transform(responses),
			getPayloads: (transformed) => transformed.map(({ meta, payload }) => ({ url: meta.url, payload })),
		});
	};
}

export function createSafeAndUnsafe<
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
	const safe = async () => applyTransformSafely(await querySafe(), transformResponse);

	return {
		safe,
		unsafe: async () => unwrapOrThrow(await safe()).response,
	};
}

export function createTransformedQueryMethods<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	querySafe,
	...transformOptions
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly querySafe: () => Promise<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	readonly transform: (response: QueryResponse<TPayload, TMeta, TExtra>) => QueryResponse<TTransformedPayload, TMeta, TExtra>;
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
}) {
	return createSafeAndUnsafe({
		querySafe,
		transformResponse: createTransformResponse<TPayload, TTransformedPayload, TError, TMeta, TExtra>(transformOptions),
	});
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
		return { success: false, error: safeResult.error };
	}

	const { success, data, error } = await transformResponse(safeResult.response);
	if (!success) {
		return { success: false, error };
	}
	return { success: true, response: data };
}
