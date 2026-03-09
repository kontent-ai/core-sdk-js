import type { Header } from "../models/core.models.js";
import { findHeaderByName } from "../utils/header.utils.js";
import type { PagedFetchQuery, Query } from "./sdk-models.js";

export function isPagingQuery<T, TBody = null>(query: Query<T> | PagedFetchQuery<T, TBody>): query is PagedFetchQuery<T, TBody> {
	return "fetchPage" in query && "fetchAllPages" in query && "pages" in query;
}

export function extractContinuationToken(responseHeaders: readonly Header[]): string | undefined {
	return findHeaderByName(responseHeaders, "X-Continuation")?.value;
}
