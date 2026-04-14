import type { JsonValue } from "../../models/json.models.js";
import { prepareQuery, resolveQuery } from "../resolve-query.js";
import type { FetchQuery, FetchQueryRequest } from "../sdk-models.js";

export function createFetchQuery<TResponsePayload extends JsonValue, TMeta, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TError>,
): FetchQuery<TResponsePayload, TMeta, TError> {
	const getQueryData = () => prepareQuery<TResponsePayload, null, TMeta, TError>({ ...data, method: "GET", body: null });
	const fetchSafe = async () => {
		const { success, data: resolvedQueryData, error } = getQueryData();
		if (!success) {
			return { success: false as const, error };
		}
		return await resolveQuery<TResponsePayload, null, TMeta, TError>(resolvedQueryData);
	};

	return {
		schema: data.zodSchema,
		getQueryData,
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
