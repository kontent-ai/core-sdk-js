import type { JsonValue } from "../../models/json.models.js";
import { inspectQuery, resolveQuery } from "../resolve-query.js";
import type { FetchQuery, FetchQueryRequest, QueryInputData } from "../sdk-models.js";

export function createFetchQuery<TResponsePayload extends JsonValue, TMeta, TExtraProps, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TExtraProps, TError>,
): FetchQuery<TResponsePayload, TMeta, TExtraProps, TError> {
	const inputData: QueryInputData<TResponsePayload, null, TMeta, TExtraProps, TError> = { ...data, method: "GET", body: null };
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
