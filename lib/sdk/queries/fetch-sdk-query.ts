/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { HttpRequestBody } from "../../http/http.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { resolveQuery } from "../resolve-query.js";
import type { FetchQuery, QueryRequest } from "../sdk-models.js";

export function createFetchQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>(
	data: Omit<QueryRequest<TResponsePayload, TRequestBody, TMeta>, "continuationToken" | "nextPageState" | "pageIndex">,
): FetchQuery<TResponsePayload, TMeta> {
	return {
		schema: data.zodSchema,
		url: data.request.url,
		fetch: async () =>
			await resolveQuery<TResponsePayload, TRequestBody, TMeta>({
				...data,
				method: "GET",
			}),
	};
}
