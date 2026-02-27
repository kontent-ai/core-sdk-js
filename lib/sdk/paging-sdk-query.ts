/**
 * Paging query helpers built on top of core query. Fetches multiple pages (continuation token or next page URL)
 * and aggregates results.
 */

import { match, P } from "ts-pattern";
import type { GetNextPageData, PaginationConfig, RequestBody } from "../http/http.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import type { NextPageStateWithRequest, PagingQuery, PagingQueryResult, Query, QueryResponse } from "./sdk-models.js";
import { createQuery, type QueryPromiseResult, type ResolveQueryData, resolveQueryAsync } from "./sdk-query.js";

type PagingQueryPromiseResult<TResponsePayload extends JsonValue, TMeta> = ReturnType<
	Pick<PagingQuery<TResponsePayload, TMeta>, "toAllPromise">["toAllPromise"]
>;

type NoNextPageState = {
	readonly hasNextPage: false;
};

type NextPageState = NextPageStateWithRequest | NoNextPageState;

type FetchAllPagesResult<TResponsePayload extends JsonValue, TMeta> =
	| {
			readonly success: true;
			readonly responses: readonly QueryResponse<TResponsePayload, TMeta>[];
			readonly error?: never;
	  }
	| {
			readonly success: false;
			readonly responses?: never;
			readonly error: ReturnType<typeof createSdkError>;
	  };

export function isPagingQuery<T, TBody = null>(query: Query<T, TBody> | PagingQuery<T, TBody>): query is PagingQuery<T, TBody> {
	return "toPromise" in query && "toAllPromise" in query && "pages" in query;
}

export function createPagingQuery<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "nextPageState" | "pageIndex"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
	},
): PagingQuery<TResponsePayload, TMeta> {
	const getPagingData: (
		config: PaginationConfig | undefined,
	) => Parameters<typeof resolvePagingQueryAsync<TResponsePayload, TRequestBody, TMeta>>[0] = (config) => {
		return {
			...data,
			pageIndex: 0,
			paginationConfig: config ?? {},
		};
	};

	return {
		toUrl: () => {
			return data.request.url;
		},
		...createQuery<TResponsePayload, TRequestBody, TMeta>(data),
		toAllPromise: async (config?: PaginationConfig) => {
			return await resolvePagingQueryAsync<TResponsePayload, TRequestBody, TMeta>(getPagingData(config));
		},
		pages: (config?: PaginationConfig) => createPagingQueryIterator<TResponsePayload, TRequestBody, TMeta>(getPagingData(config)),
	};
}

async function* createPagingQueryIterator<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta>(
	data: Omit<Parameters<typeof resolvePagingQueryAsync<TResponsePayload, TRequestBody, TMeta>>[0], "pageIndex">,
): AsyncGenerator<QueryResponse<TResponsePayload, TMeta>> {
	let nextPageState: NextPageState = { hasNextPage: true, pageSource: "firstRequest" };
	let pageIndex: number = 0;

	while (isNextPageAvailable(nextPageState)) {
		const result: Awaited<QueryPromiseResult<TResponsePayload, TMeta>> = await resolveQueryAsync<TResponsePayload, TRequestBody, TMeta>(
			{
				...data,
				nextPageState: nextPageState,
			},
		);

		if (!result.success) {
			throw result.error;
		}

		yield result.response;

		pageIndex++;
		nextPageState = resolveNextPageState({
			getNextPageData: data.getNextPageData,
			paginationConfig: data.paginationConfig,
			pageIndex: pageIndex,
			response: result.response,
		});
	}
}

function resolveNextPageState<TResponsePayload extends JsonValue, TMeta>({
	paginationConfig,
	getNextPageData,
	pageIndex,
	response,
}: {
	readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
	readonly paginationConfig: PaginationConfig;
	readonly pageIndex: number;
	readonly response: QueryResponse<TResponsePayload, TMeta> | undefined;
}): NextPageState {
	return match({ getNextPageData, paginationConfig, pageIndex, response })
		.returnType<NextPageState>()
		.with({ response: undefined }, () => ({
			hasNextPage: true,
			pageSource: "firstRequest",
		}))
		.with({ paginationConfig: { maxPagesCount: 0 } }, () => ({
			hasNextPage: false,
		}))
		.with({ paginationConfig: { maxPagesCount: pageIndex } }, () => ({
			hasNextPage: false,
		}))
		.with({ response: P.not(undefined) }, (m) => {
			const responsePageData = m.getNextPageData(m.response);

			return match(responsePageData)
				.returnType<NextPageState>()
				.with({ continuationToken: P.string.minLength(1) }, (m) => ({
					hasNextPage: true,
					pageSource: "continuationToken",
					continuationToken: m.continuationToken,
				}))
				.with({ nextPageUrl: P.string.minLength(1) }, (m) => ({
					hasNextPage: true,
					pageSource: "nextPageUrl",
					nextPageUrl: m.nextPageUrl,
				}))
				.otherwise(() => ({
					hasNextPage: false,
				}));
		})
		.otherwise(() => {
			return {
				hasNextPage: false,
			};
		});
}

async function resolvePagingQueryAsync<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "nextPageState" | "getNextPageData"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
		readonly paginationConfig: PaginationConfig;
		readonly pageIndex: number;
	},
): Promise<PagingQueryPromiseResult<TResponsePayload, TMeta>> {
	const { success, error, responses } = await fetchAllPagesAsync<TResponsePayload, TRequestBody, TMeta>(data);

	if (!success) {
		return {
			success: false,
			error,
		};
	}

	return validateAndBuildPagingResult(responses, data.request.url);
}

async function fetchAllPagesAsync<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "nextPageState"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
		readonly paginationConfig: PaginationConfig;
		readonly pageIndex: number;
	},
): Promise<FetchAllPagesResult<TResponsePayload, TMeta>> {
	const initialPageState: NextPageState = resolveNextPageState({
		getNextPageData: data.getNextPageData,
		paginationConfig: data.paginationConfig,
		pageIndex: data.pageIndex,
		response: undefined,
	});

	return await fetchAllPagesInternal<TResponsePayload, TRequestBody, TMeta>({
		queryData: data,
		nextPageState: initialPageState,
		responses: [],
	});
}

async function fetchAllPagesInternal<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta>({
	queryData,
	nextPageState,
	responses,
}: {
	readonly queryData: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "nextPageState"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
		readonly paginationConfig: PaginationConfig;
		readonly pageIndex: number;
	};
	readonly nextPageState: NextPageState;
	readonly responses: readonly QueryResponse<TResponsePayload, TMeta>[];
}): Promise<FetchAllPagesResult<TResponsePayload, TMeta>> {
	if (!isNextPageAvailable(nextPageState)) {
		return {
			success: true,
			responses,
		};
	}

	const { success, error, response } = await resolveQueryAsync<TResponsePayload, TRequestBody, TMeta>({
		...queryData,
		nextPageState: nextPageState,
	});

	if (!success) {
		return {
			success: false,
			error: error,
		};
	}

	const updatedResponses: readonly QueryResponse<TResponsePayload, TMeta>[] = [...responses, response];

	return await fetchAllPagesInternal<TResponsePayload, TRequestBody, TMeta>({
		queryData: queryData,
		nextPageState: resolveNextPageState({
			getNextPageData: queryData.getNextPageData,
			paginationConfig: queryData.paginationConfig,
			pageIndex: updatedResponses.length,
			response: response,
		}),
		responses: updatedResponses,
	});
}

function validateAndBuildPagingResult<TResponsePayload extends JsonValue, TMeta>(
	responses: readonly QueryResponse<TResponsePayload, TMeta>[],
	requestUrl: string,
): PagingQueryResult<QueryResponse<TResponsePayload, TMeta>> {
	const lastResponse = responses.at(-1);

	if (!lastResponse) {
		return {
			success: false,
			error: createSdkError({
				reason: "noResponses",
				url: requestUrl,
				message: "No responses were processed. Expected at least one response to be fetched when using paging queries.",
			}),
		};
	}

	return {
		success: true,
		responses: [...responses],
		lastContinuationToken: lastResponse.meta.continuationToken,
	};
}

function isNextPageAvailable(nextPageState: NextPageState): nextPageState is NextPageStateWithRequest {
	return nextPageState.hasNextPage;
}
