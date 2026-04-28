import type { JsonValue } from "../models/json.models.js";
import type { PagedFetchQuery, Query } from "./sdk-models.js";

/**
 * Checks if a query is a paging query.
 *
 */
export function isPagingQuery<TResponsePayload extends JsonValue, TMeta, TError>(
	query: Query<TResponsePayload, TError> | PagedFetchQuery<TResponsePayload, TMeta, unknown, unknown, TError>,
): query is PagedFetchQuery<TResponsePayload, TMeta, unknown, unknown, TError> {
	return (
		"fetchPage" in query &&
		"fetchPageSafe" in query &&
		"fetchAllPages" in query &&
		"fetchAllPagesSafe" in query &&
		"pages" in query &&
		"pagesSafe" in query
	);
}
