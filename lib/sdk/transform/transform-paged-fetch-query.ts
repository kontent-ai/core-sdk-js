import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { isNonEmptyArray } from "../../utils/array.utils.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import { unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { PagedFetchQuery, QueryResponse, SafeQueryResult, SdkConfig } from "../sdk-models.js";
import { createBatchTransformResponses, createTransformError } from "./transform-utils.js";

const emptyTransformResultMessage = "Transform returned no response for input";

/**
 * Wraps a paged query so that every page's payload is passed through `transform`.
 *
 * Paging extras returned by `fetchAllPages` / `fetchAllPagesSafe` are intentionally kept from the wrapped query:
 * they are computed by its `mapPagingExtraResponseProps` from the untransformed responses, which is also why
 * their type (`TPagingExtra`) is unchanged by the transform.
 */
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
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
}): PagedFetchQuery<TTransformedPayload, TError, TMeta, TExtra, TPagingExtra> {
	const batchTransformResponses = createBatchTransformResponses<TPayload, TTransformedPayload, TError, TMeta, TExtra>({
		config,
		transform,
		transformSchema,
		mapError,
	});

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
			error: mapError(createTransformError(new Error(emptyTransformResultMessage), safeResult.response.meta.url)),
		};
	};

	const fetchPageSafe = async () => transformSingleSafely(await query.fetchPageSafe());
	const fetchAllPagesSafe: PagedFetchQuery<TTransformedPayload, TError, TMeta, TExtra, TPagingExtra>["fetchAllPagesSafe"] = async (
		config,
	) => {
		const result = await query.fetchAllPagesSafe(config);
		if (!result.success) {
			return { success: false as const, error: result.error };
		}
		const { success, data, error } = await batchTransformResponses(result.responses);
		if (!success) {
			return { success: false as const, error };
		}
		return { ...result, success: true, responses: data };
	};

	return {
		fetchPage: async () => unwrapOrThrow(await fetchPageSafe()).response,
		fetchPageSafe,
		fetchAllPages: async (config) => {
			const result = await query.fetchAllPages(config);
			const { data: responses } = unwrapOrThrow(await batchTransformResponses(result.responses));
			return { ...result, responses };
		},
		fetchAllPagesSafe,
		pages: async function* (config) {
			for await (const safeResult of query.pagesSafe(config)) {
				yield unwrapOrThrow(await transformSingleSafely(safeResult)).response;
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
