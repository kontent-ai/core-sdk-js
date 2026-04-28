import type { JsonValue } from "../models/json.models.js";
import type { PagedFetchQuery, Query } from "./sdk-models.js";

/**
 * Checks if a query is a paging query.
 *
 */
export function isPagingQuery<TPayload extends JsonValue, TError, TMeta>(
	query: Query<TPayload, TError> | PagedFetchQuery<TPayload, TError, TMeta>,
): query is PagedFetchQuery<TPayload, TError, TMeta> {
	return (
		"fetchPage" in query &&
		"fetchPageSafe" in query &&
		"fetchAllPages" in query &&
		"fetchAllPagesSafe" in query &&
		"pages" in query &&
		"pagesSafe" in query
	);
}
