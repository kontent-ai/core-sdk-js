/**
 * Paging query helpers built on top of core query. Fetches multiple pages (continuation token or next page URL)
 * and aggregates results.
 */

import { match, P } from "ts-pattern";
import type { GetNextPageData, HttpRequestBody, PaginationConfig } from "../http/http.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import type { NextPageStateWithRequest, PagingQuery, QueryPromiseResult, QueryResponse, QueryResult } from "./sdk-models.js";
import { createQuery, type ResolveQueryData, resolveQueryAsync } from "./sdk-query.js";

type PagingQueryPromiseResult<TResponsePayload extends JsonValue, TMeta> = ReturnType<
	Pick<PagingQuery<TResponsePayload, TMeta>, "toAllPromise">["toAllPromise"]
>;

type NoNextPageState = {
	readonly hasNextPage: false;
};

type NextPageState = NextPageStateWithRequest | NoNextPageState;

export function createPagingQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "nextPageState" | "pageIndex"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
	},
): PagingQuery<TResponsePayload, TMeta> {
	const getPagingData: (
		config: PaginationConfig | undefined,
	) => Parameters<typeof fetchAllPagesAsync<TResponsePayload, TRequestBody, TMeta>>[0] = (config) => {
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
			return await fetchAllPagesAsync<TResponsePayload, TRequestBody, TMeta>(getPagingData(config));
		},
		pages: (config?: PaginationConfig) => createPagingQueryIterator<TResponsePayload, TRequestBody, TMeta>(getPagingData(config)),
	};
}

async function* createPagingQueryIterator<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>(
	data: Omit<Parameters<typeof fetchAllPagesAsync<TResponsePayload, TRequestBody, TMeta>>[0], "pageIndex">,
): AsyncGenerator<QueryResult<QueryResponse<TResponsePayload, TMeta>>> {
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
			yield { success: false, error: result.error };
			return;
		}

		yield { success: true, response: result.response };

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
	readonly response: QueryResponse<TResponsePayload, TMeta>;
}): NextPageState {
	return match({ getNextPageData, paginationConfig, pageIndex, response })
		.returnType<NextPageState>()
		.with({ paginationConfig: { maxPagesCount: 0 } }, () => ({
			hasNextPage: false,
		}))
		.with({ paginationConfig: { maxPagesCount: pageIndex } }, () => ({
			hasNextPage: false,
		}))
		.otherwise((m) => {
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
		});
}

async function fetchAllPagesAsync<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "nextPageState"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
		readonly paginationConfig: PaginationConfig;
		readonly pageIndex: number;
	},
): Promise<PagingQueryPromiseResult<TResponsePayload, TMeta>> {
	const responses: QueryResponse<TResponsePayload, TMeta>[] = [];

	for await (const result of createPagingQueryIterator<TResponsePayload, TRequestBody, TMeta>(data)) {
		if (!result.success) {
			return { success: false, error: result.error, partialResponses: responses };
		}

		responses.push(result.response);
	}

	return validateAndBuildPagingResult({ responses, initialUrl: data.request.url });
}

function validateAndBuildPagingResult<TResponsePayload extends JsonValue, TMeta>({
	responses,
	initialUrl,
}: {
	readonly responses: readonly QueryResponse<TResponsePayload, TMeta>[];
	readonly initialUrl: string;
}): Awaited<PagingQueryPromiseResult<TResponsePayload, TMeta>> {
	const lastResponse = responses.at(-1);

	if (!lastResponse) {
		return {
			success: false,
			partialResponses: responses,
			error: createSdkError({
				baseErrorData: {
					retryStrategyOptions: undefined,
					retryAttempt: undefined,
					url: initialUrl,
					message: "No responses were processed. Expected at least one response to be fetched when using paging queries.",
				},
				details: {
					reason: "noResponses",
					url: initialUrl,
				},
			}),
		};
	}

	return {
		success: true,
		responses: responses,
		lastContinuationToken: lastResponse.meta.continuationToken,
	};
}

function isNextPageAvailable(nextPageState: NextPageState): nextPageState is NextPageStateWithRequest {
	return nextPageState.hasNextPage;
}
