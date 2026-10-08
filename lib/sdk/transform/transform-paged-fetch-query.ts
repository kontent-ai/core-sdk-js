import type { SafeHttpResult } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { PagedFetchQuery, QueryResponse } from "../sdk-models.js";
import { unwrapResults } from "../sdk-utils.js";
import {
	applyTransformSafely,
	type BatchTransformOptions,
	createBatchTransformResponses,
	createSafeAndUnsafe,
	toSingleTransform,
} from "./transform-utils.js";

export function transformPagedFetchQuery<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
	TPagingExtra,
>({
	query,
	...options
}: BatchTransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra> & {
	readonly query: PagedFetchQuery<TPayload, TError, TMeta, TExtra, TPagingExtra>;
}): PagedFetchQuery<TTransformedPayload, TError, TMeta, TExtra, TPagingExtra> {
	const batchTransformResponses = createBatchTransformResponses(options);
	const transformSingle = toSingleTransform({ batchTransform: batchTransformResponses, mapError: options.mapError });

	const { safe: fetchPageSafe, unsafe: fetchPage } = createSafeAndUnsafe({
		querySafe: query.fetchPageSafe,
		transformResponse: transformSingle,
	});

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

	const pagesSafe = async function* (
		config: Parameters<PagedFetchQuery<TPayload, TError, TMeta, TExtra, TPagingExtra>["pagesSafe"]>[0],
	): AsyncGenerator<SafeHttpResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> {
		for await (const safeResult of query.pagesSafe(config)) {
			const result = await applyTransformSafely(safeResult, transformSingle);
			yield result;
			if (!result.success) {
				return;
			}
		}
	};

	return {
		fetchPage,
		fetchPageSafe,
		fetchAllPages: async (config) => {
			const result = await query.fetchAllPages(config);
			const { data: responses } = unwrapOrThrow(await batchTransformResponses(result.responses));
			return { ...result, responses };
		},
		fetchAllPagesSafe,
		pages: (config) => unwrapResults(pagesSafe(config)),
		pagesSafe,
		inspect: query.inspect,
	};
}
