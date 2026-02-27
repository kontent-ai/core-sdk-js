import type { PagingQuery, Query } from "./sdk-models.js";

export function isPagingQuery<T, TBody = null>(query: Query<T, TBody> | PagingQuery<T, TBody>): query is PagingQuery<T, TBody> {
	return "toPromise" in query && "toAllPromise" in query && "pages" in query;
}
