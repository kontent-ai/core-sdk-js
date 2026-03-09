import type { PagedFetchQuery, Query } from "./sdk-models.js";

export function isPagingQuery<T, TBody = null>(query: Query<T> | PagedFetchQuery<T, TBody>): query is PagedFetchQuery<T, TBody> {
	return "fetchPage" in query && "fetchAllPages" in query && "pages" in query;
}
