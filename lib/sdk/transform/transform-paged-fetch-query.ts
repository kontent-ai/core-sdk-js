import type { SafeHttpResult } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import { type TryCatchResult, unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { PagedFetchQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { applyTransformSafely, createBatchTransformResponses, createSafeAndUnsafe, createTransformError } from "./transform-utils.js";

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

	const transformSingle = async (
		response: QueryResponse<TPayload, TMeta, TExtra>,
	): Promise<TryCatchResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> => {
		const result = await batchTransformResponses([response]);
		if (!result.success) {
			return result;
		}
		const [first] = result.data;
		return first
			? { success: true, data: first }
			: { success: false, error: mapError(createTransformError(new Error(emptyTransformResultMessage), response.meta.url)) };
	};

	const transformSingleSafely = async (safeResult: SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>) =>
		applyTransformSafely(safeResult, transformSingle);

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

	return {
		fetchPage,
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
