import type { ZodType } from "zod";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { type TryCatchResult, tryCatch } from "../../utils/try-catch.utils.js";
import type { PagedFetchQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { parseResponse } from "../sdk-utils.js";
import { createTransformError } from "./transform-utils.js";

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
	const transformResponse = async (
		response: QueryResponse<TPayload, TMeta, TExtra>,
	): Promise<TryCatchResult<QueryResponse<TTransformedPayload, TMeta, TExtra>, TError>> => {
		const { success, data: transformedPayload, error } = tryCatch(() => transform(response.payload));

		if (!success) {
			return {
				success: false,
				error: mapError(createTransformError(error, response.meta.url)),
			};
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

		return {
			success: true,
			data: {
				...response,
				payload: transformedPayload,
			},
		};
	};

	const transformResponses = async (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	): Promise<TryCatchResult<readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[], TError>> => {
		const transformedResponses: QueryResponse<TTransformedPayload, TMeta, TExtra>[] = [];

		for (const response of responses) {
			const { success, data: transformedResponse, error } = await transformResponse(response);
			if (!success) {
				return { success: false, error };
			}

			transformedResponses.push(transformedResponse);
		}

		return { success: true, data: transformedResponses };
	};

	return {
		fetchPage: async () => {
			const response = await query.fetchPage();
			const { success, data: transformedResponse, error } = await transformResponse(response);

			if (!success) {
				throw error;
			}

			return transformedResponse;
		},
		fetchPageSafe: async () => {
			const response = await query.fetchPageSafe();
			if (!response.success) {
				return response;
			}

			const {
				success: transformSuccess,
				data: transformedResponse,
				error: transformError,
			} = await transformResponse(response.response);

			if (!transformSuccess) {
				return { success: false, error: transformError };
			}

			return {
				success: true,
				response: transformedResponse,
			};
		},
		fetchAllPages: async (config) => {
			const result = await query.fetchAllPages(config);

			const { success, data: transformedResponses, error } = await transformResponses(result.responses);

			if (!success) {
				throw error;
			}

			return {
				...result,
				responses: transformedResponses,
			};
		},
		fetchAllPagesSafe: async (config) => {
			const result = await query.fetchAllPagesSafe(config);

			if (!result.success) {
				return {
					success: false as const,
					error: result.error,
				};
			}

			const { success, data: transformedResponses, error } = await transformResponses(result.responses);

			if (!success) {
				return { success: false as const, error };
			}

			return {
				...result,
				success: true,
				responses: transformedResponses,
			};
		},
		pages: async function* (config) {
			const iterator = query.pages(config);
			for await (const response of iterator) {
				const { success, data: transformedResponse, error } = await transformResponse(response);
				if (!success) {
					throw error;
				}
				yield transformedResponse;
			}
		},
		pagesSafe: async function* (config) {
			const safeIterator = query.pagesSafe(config);
			for await (const safeResult of safeIterator) {
				if (!safeResult.success) {
					yield safeResult;
					return;
				}
				const { success, data: transformedResponse, error } = await transformResponse(safeResult.response);
				if (!success) {
					yield { success: false as const, error };
					return;
				}
				yield { success: true, response: transformedResponse };
			}
		},
		inspect: query.inspect,
	};
}
