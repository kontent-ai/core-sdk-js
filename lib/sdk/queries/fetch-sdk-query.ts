import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { inspectQuery, resolveQuery } from "../resolve-query.js";
import type { FetchQuery, FetchQueryRequest, QueryInputData } from "../sdk-models.js";

export function createFetchQuery<
	TPayload extends JsonValue,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
	TTransformedPayload extends TPayload = TPayload,
>(
	data: FetchQueryRequest<TPayload, TError, TMeta, TExtra, TTransformedPayload>,
): FetchQuery<TPayload, TError, TMeta, TExtra, TTransformedPayload> {
	const inputData: QueryInputData<TPayload, null, TMeta, TExtra, TError, TTransformedPayload> = { ...data, method: "GET", body: null };
	const fetchSafe = async () => await resolveQuery(inputData);

	return {
		schema: data.zodSchema,
		inspect: () => inspectQuery(inputData),
		fetchSafe,
		fetch: async () => {
			const { success, response, error } = await fetchSafe();
			if (!success) {
				throw error;
			}
			return response;
		},
	};
}
