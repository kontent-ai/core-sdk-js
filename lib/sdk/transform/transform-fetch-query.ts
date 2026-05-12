import type { ZodType } from "zod";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { type TryCatchResult, tryCatch } from "../../utils/try-catch.utils.js";
import type { FetchQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { parseResponse } from "../sdk-utils.js";
import { createTransformError } from "./transform-utils.js";

export function transformFetchQuery<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	query,
	transform,
	transformSchema,
	mapError,
	config,
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly query: FetchQuery<TPayload, TError, TMeta, TExtra>;
	readonly transform: (payload: TPayload) => TTransformedPayload;
	readonly transformSchema: () => Promise<ZodType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): FetchQuery<TTransformedPayload, TError, TMeta, TExtra> {
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

	return {
		fetch: async () => {
			const result = await query.fetch();
			const { success, data: transformedResponse, error } = await transformResponse(result);

			if (!success) {
				throw error;
			}

			return transformedResponse;
		},
		fetchSafe: async () => {
			const result = await query.fetchSafe();
			if (!result.success) {
				return result;
			}

			const {
				success: transformSuccess,
				data: transformedResponse,
				error: transformError,
			} = await transformResponse(result.response);

			if (!transformSuccess) {
				return { success: false, error: transformError };
			}

			return {
				success: true,
				response: transformedResponse,
			};
		},
		inspect: query.inspect,
	};
}
