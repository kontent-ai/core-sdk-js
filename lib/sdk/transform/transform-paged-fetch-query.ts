import type { SafeHttpResult } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { PagedFetchQuery, PagingConfig, QueryResponse } from "../sdk-models.js";
import { unwrapResults } from "../sdk-utils.js";
import type { PagedTransformOptions, TransformOptions } from "./transform.models.js";
import { transformResponses, transformSafeResult } from "./transform-utils.js";

const emptyTransformResultMessage = "Transform returned no response for input";

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
}: PagedTransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra> & {
	readonly query: PagedFetchQuery<TPayload, TError, TMeta, TExtra, TPagingExtra>;
}): PagedFetchQuery<TTransformedPayload, TError, TMeta, TExtra, TPagingExtra> {
	// single-page methods apply the batch transform to one page at a time
	const singleOptions = toSingleTransformOptions(options);

	const fetchPageSafe = async () => await transformSafeResult(singleOptions, await query.fetchPageSafe());

	const fetchAllPagesSafe: PagedFetchQuery<TTransformedPayload, TError, TMeta, TExtra, TPagingExtra>["fetchAllPagesSafe"] = async (
		config,
	) => {
		const result = await query.fetchAllPagesSafe(config);
		if (!result.success) {
			return result;
		}
		const { success, data, error } = await transformResponses(options, result.responses);
		if (!success) {
			return { success: false as const, error };
		}
		return { ...result, success: true, responses: data };
	};

	const pagesSafe = async function* (
		config?: PagingConfig,
	): AsyncGenerator<SafeHttpResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> {
		for await (const safeResult of query.pagesSafe(config)) {
			const result = await transformSafeResult(singleOptions, safeResult);
			yield result;
			if (!result.success) {
				return;
			}
		}
	};

	return {
		inspect: query.inspect,
		fetchPageSafe,
		fetchPage: async () => unwrapOrThrow(await fetchPageSafe()).response,
		fetchAllPagesSafe,
		fetchAllPages: async (config) => {
			const result = await query.fetchAllPages(config);
			const { data: responses } = unwrapOrThrow(await transformResponses(options, result.responses));
			return { ...result, responses };
		},
		pagesSafe,
		pages: (config) => unwrapResults(pagesSafe(config)),
	};
}

/**
 * Adapts a batch transform to a single response. Throws when the transform returns no response for it,
 * which `transformSafeResult` reports as a `transformError`.
 */
function toSingleTransformOptions<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	transform,
	...options
}: PagedTransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra>): TransformOptions<
	TPayload,
	TTransformedPayload,
	TError,
	TMeta,
	TExtra
> {
	return {
		...options,
		transform: (response) => {
			const [transformedResponse] = transform([response]);

			if (!transformedResponse) {
				throw new Error(emptyTransformResultMessage);
			}

			return transformedResponse;
		},
	};
}
