import type { ZodType } from "zod";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { createSdkError } from "../../utils/error.utils.js";
import { type TryCatchResult, tryCatch } from "../../utils/try-catch.utils.js";
import type { FetchQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { parseResponse } from "../sdk-utils.js";

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
	const mapPayload = async (response: QueryResponse<TPayload, TMeta, TExtra>): Promise<TryCatchResult<TTransformedPayload, TError>> => {
		const { success, data: transformedPayload, error } = tryCatch(() => transform(response.payload));

		if (!success) {
			return {
				success: false,
				error: mapError(
					createSdkError({
						baseErrorData: {
							message: `Failed to transform payload for url ${response.meta.url.toString()}`,
							url: response.meta.url.toString(),
							retryAttempt: undefined,
							retryStrategyOptions: undefined,
						},
						details: {
							originalError: error,
							reason: "transformError",
						},
					}),
				),
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

		return { success: true, data: transformedPayload };
	};

	return {
		fetch: async () => {
			const response = await query.fetch();
			const { success, data, error } = await mapPayload(response);

			if (!success) {
				throw error;
			}

			return {
				...response,
				payload: data,
			};
		},
		fetchSafe: async () => {
			const response = await query.fetchSafe();
			if (!response.success) {
				return response;
			}

			const { success: transformSuccess, data: transformedPayload, error: transformError } = await mapPayload(response.response);

			if (!transformSuccess) {
				return { success: false, error: transformError };
			}

			return {
				success: true,
				response: {
					...response.response,
					payload: transformedPayload,
				},
			};
		},
		inspect: query.inspect,
	};
}
