import type { JsonValue } from "../../models/json.models.js";
import { resolveQuery, resolveUrl } from "../resolve-query.js";
import type { FetchQuery, FetchQueryRequest } from "../sdk-models.js";

export function createFetchQuery<TResponsePayload extends JsonValue, TMeta, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TError>,
): FetchQuery<TResponsePayload, TMeta, TError> {
	const fetchSafe = async () =>
		await resolveQuery<TResponsePayload, null, TMeta, TError>({
			...data,
			method: "GET",
			body: null,
		});

	return {
		schema: data.zodSchema,
		getUrl: () => resolveUrl<TError>({ url: data.url, baseUrl: data.config.baseUrl, mapError: data.mapError }),
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
