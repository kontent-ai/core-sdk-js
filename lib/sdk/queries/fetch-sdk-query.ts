import type { JsonValue } from "../../models/json.models.js";
import { inspectQuery, prepareQueryData, resolveQuery } from "../resolve-query.js";
import type { FetchQuery, FetchQueryRequest, QueryInputData } from "../sdk-models.js";

export function createFetchQuery<TResponsePayload extends JsonValue, TMeta, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TError>,
): FetchQuery<TResponsePayload, TMeta, TError> {
	const inputData: QueryInputData<TResponsePayload, null, TMeta, TError> = { ...data, method: "GET", body: null };
	const fetchSafe = async () => {
		const { success, data: resolvedQueryData, error } = prepareQueryData(inputData);
		if (!success) {
			return { success: false as const, error };
		}
		return await resolveQuery(resolvedQueryData);
	};

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
