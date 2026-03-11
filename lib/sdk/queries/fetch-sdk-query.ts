/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { JsonValue } from "../../models/json.models.js";
import { resolveQuery } from "../resolve-query.js";
import type { FetchQuery, FetchQueryRequest } from "../sdk-models.js";

export function createFetchQuery<TResponsePayload extends JsonValue, TMeta>(
	data: Omit<FetchQueryRequest<TResponsePayload, TMeta>, "continuationToken" | "nextPageState" | "pageIndex">,
): FetchQuery<TResponsePayload, TMeta> {
	return {
		schema: data.zodSchema,
		url: data.request.url,
		fetch: async () =>
			await resolveQuery<TResponsePayload, null, TMeta>({
				...data,
				method: "GET",
				request: {
					...data.request,
					body: null,
				},
			}),
	};
}
