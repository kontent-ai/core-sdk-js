import type { PagedFetchQuery, Query } from "./sdk-models.js";

/**
 * Checks if a query is a paging query.
 *
 */
export function isPagingQuery<T, TBody = null, TError = unknown>(
	query: Query<T> | PagedFetchQuery<T, TBody, TError>,
): query is PagedFetchQuery<T, TBody, TError> {
	return (
		"fetchPage" in query &&
		"fetchPageSafe" in query &&
		"fetchAllPages" in query &&
		"fetchAllPagesSafe" in query &&
		"pages" in query &&
		"pagesSafe" in query
	);
}
