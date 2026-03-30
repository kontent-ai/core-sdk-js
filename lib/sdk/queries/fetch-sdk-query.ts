/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */
import type { JsonValue } from "../../models/json.models.js";
import { resolveQuery } from "../resolve-query.js";
import type { FetchQuery, FetchQueryRequest } from "../sdk-models.js";

export function createFetchQuery<TResponsePayload extends JsonValue, TMeta, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TError>,
): FetchQuery<TResponsePayload, TMeta, TError> {
	const fetchSafe = async () =>
		await resolveQuery<TResponsePayload, null, TMeta, TError>({
			...data,
			method: "GET",
			request: {
				...data.request,
				body: null,
			},
		});
	return {
		schema: data.zodSchema,
		url: data.request.url,
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
