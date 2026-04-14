import type { HttpRequestBody } from "../http/http.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { PagedFetchQuery, Query } from "./sdk-models.js";

/**
 * Checks if a query is a paging query.
 *
 */
export function isPagingQuery<TResponsePayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TError>(
	query: Query<TResponsePayload, TBody, TMeta, TError> | PagedFetchQuery<TResponsePayload, TMeta, TError>,
): query is PagedFetchQuery<TResponsePayload, TMeta, TError> {
	return (
		"fetchPage" in query &&
		"fetchPageSafe" in query &&
		"fetchAllPages" in query &&
		"fetchAllPagesSafe" in query &&
		"pages" in query &&
		"pagesSafe" in query
	);
}
