import type { ZodMiniType } from "zod/mini";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { isNonEmptyArray } from "../../utils/array.utils.js";
import type { PagedFetchQuery, QueryResponse, SafeQueryResult, SdkConfig } from "../sdk-models.js";
import { createBatchTransformResponses, createTransformError } from "./transform-utils.js";

export function transformPagedFetchQuery<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
	TPagingExtra,
>({
	query,
	transform,
	transformSchema,
	mapError,
	config,
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly query: PagedFetchQuery<TPayload, TError, TMeta, TExtra, TPagingExtra>;
	readonly transform: (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	) => readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[];
	readonly transformSchema: () => Promise<ZodMiniType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): PagedFetchQuery<TTransformedPayload, TError, TMeta, TExtra, TPagingExtra> {
	const batchTransformResponses = createBatchTransformResponses<TPayload, TTransformedPayload, TError, TMeta, TExtra>({
		config,
		transform,
		transformSchema,
		mapError,
	});

	const transformSingleOrThrow = async (
		response: QueryResponse<TPayload, TMeta, TExtra>,
	): Promise<QueryResponse<TTransformedPayload, TMeta, TExtra>> => {
		const { success, data, error } = await batchTransformResponses([response]);
		if (!success) {
			throw error;
		}

		if (isNonEmptyArray(data)) {
			return data[0];
		}
		throw mapError(createTransformError(new Error("Transform returned no response for input"), response.meta.url));
	};

	const transformSingleSafely = async (
		safeResult: SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>,
	): Promise<SafeQueryResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> => {
		if (!safeResult.success) {
			return { success: false, error: safeResult.error };
		}
		const { success, data, error } = await batchTransformResponses([safeResult.response]);
		if (!success) {
			return { success: false, error };
		}
		if (isNonEmptyArray(data)) {
			return { success: true, response: data[0] };
		}
		return {
			success: false,
			error: mapError(createTransformError(new Error("Transform returned no response for input"), safeResult.response.meta.url)),
		};
	};

	return {
		fetchPage: async () => transformSingleOrThrow(await query.fetchPage()),
		fetchPageSafe: async () => transformSingleSafely(await query.fetchPageSafe()),
		fetchAllPages: async (config) => {
			const result = await query.fetchAllPages(config);
			const { success, data, error } = await batchTransformResponses(result.responses);
			if (!success) {
				throw error;
			}
			return { ...result, responses: data };
		},
		fetchAllPagesSafe: async (config) => {
			const result = await query.fetchAllPagesSafe(config);
			if (!result.success) {
				return { success: false as const, error: result.error };
			}
			const { success, data, error } = await batchTransformResponses(result.responses);
			if (!success) {
				return { success: false as const, error };
			}
			return { ...result, success: true, responses: data };
		},
		pages: async function* (config) {
			for await (const response of query.pages(config)) {
				yield await transformSingleOrThrow(response);
			}
		},
		pagesSafe: async function* (config) {
			for await (const safeResult of query.pagesSafe(config)) {
				const result = await transformSingleSafely(safeResult);
				yield result;
				if (!result.success) {
					return;
				}
			}
		},
		inspect: query.inspect,
	};
}
