import type { ZodType } from "zod";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { TryCatchResult } from "../../utils/try-catch.utils.js";
import type { PagedFetchQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { applyTransformOrThrow, applyTransformSafely, createTransformResponse } from "./transform-utils.js";

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
	readonly transform: (payload: TPayload) => TTransformedPayload;
	readonly transformSchema: () => Promise<ZodType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): PagedFetchQuery<TTransformedPayload, TError, TMeta, TExtra, TPagingExtra> {
	const transformResponse = createTransformResponse<TPayload, TTransformedPayload, TError, TMeta, TExtra>({
		config,
		transform,
		transformSchema,
		mapError,
	});

	const transformResponses = async (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	): Promise<TryCatchResult<readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[], TError>> => {
		const transformedResponses: QueryResponse<TTransformedPayload, TMeta, TExtra>[] = [];

		for (const response of responses) {
			const { success, data, error } = await transformResponse(response);
			if (!success) {
				return { success: false, error };
			}
			transformedResponses.push(data);
		}

		return { success: true, data: transformedResponses };
	};

	return {
		fetchPage: async () => applyTransformOrThrow(await query.fetchPage(), transformResponse),
		fetchPageSafe: async () => applyTransformSafely(await query.fetchPageSafe(), transformResponse),
		fetchAllPages: async (config) => {
			const result = await query.fetchAllPages(config);
			const { success, data, error } = await transformResponses(result.responses);
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
			const { success, data, error } = await transformResponses(result.responses);
			if (!success) {
				return { success: false as const, error };
			}
			return { ...result, success: true, responses: data };
		},
		pages: async function* (config) {
			for await (const response of query.pages(config)) {
				yield await applyTransformOrThrow(response, transformResponse);
			}
		},
		pagesSafe: async function* (config) {
			for await (const safeResult of query.pagesSafe(config)) {
				const result = await applyTransformSafely(safeResult, transformResponse);
				yield result;
				if (!result.success) {
					return;
				}
			}
		},
		inspect: query.inspect,
	};
}
