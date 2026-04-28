import { match, P } from "ts-pattern";
import type { ExtractNextPageDataFn, PaginationConfig } from "../../http/http.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type {
	FetchQueryRequest,
	NextPageStateWithRequest,
	PagedFetchQuery,
	PagingQueryInputData,
	QueryResponse,
	SafePagingQueryResult,
	SafeQueryResponse,
} from "../sdk-models.js";
import { createFetchQuery } from "./fetch-sdk-query.js";

type PagingQueryPromiseResult<TResponsePayload extends JsonValue, TMeta, TExtraProps, TPagingExtraProps, TError> = SafePagingQueryResult<
	QueryResponse<TResponsePayload, TMeta, TExtraProps>,
	TPagingExtraProps,
	TError
>;

type NoNextPageState = {
	readonly hasNextPage: false;
};

type NextPageState = NextPageStateWithRequest | NoNextPageState;

export function createPagedFetchQuery<TResponsePayload extends JsonValue, TMeta, TExtraProps, TPagingExtraProps, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TExtraProps, TError> & {
		readonly getNextPageData: ExtractNextPageDataFn<TResponsePayload, TMeta, TExtraProps>;
		readonly mapPagingExtraResponseProps: (
			response: readonly QueryResponse<TResponsePayload, TMeta, TExtraProps>[],
		) => TPagingExtraProps;
	},
): PagedFetchQuery<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError> {
	const getPagingData: (
		config: PaginationConfig | undefined,
	) => Parameters<typeof fetchAllPages<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>>[0] = (config) => {
		return {
			...data,
			method: "GET",
			pageIndex: 0,
			paginationConfig: config ?? {},
			body: null,
		};
	};

	const fetchQuery = createFetchQuery<TResponsePayload, TMeta, TExtraProps, TError>(data);

	return {
		schema: fetchQuery.schema,
		inspect: () => fetchQuery.inspect(),
		fetchPage: async () => await fetchQuery.fetch(),
		fetchPageSafe: async () => await fetchQuery.fetchSafe(),
		fetchAllPages: async (config?: PaginationConfig) => {
			const { success, error, partialResponses, responses } = await fetchAllPages<
				TResponsePayload,
				TMeta,
				TExtraProps,
				TPagingExtraProps,
				TError
			>(getPagingData(config));
			if (!success) {
				throw error;
			}
			return {
				...data.mapPagingExtraResponseProps(responses),
				responses,
				partialResponses,
			};
		},
		fetchAllPagesSafe: async (config?: PaginationConfig) =>
			await fetchAllPages<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>(getPagingData(config)),
		pagesSafe: (config?: PaginationConfig) =>
			createPagingQueryIterator<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>(getPagingData(config)),
		pages: async function* (config?: PaginationConfig) {
			const iterator = createPagingQueryIterator<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>(
				getPagingData(config),
			);
			for await (const result of iterator) {
				if (!result.success) {
					throw result.error;
				}
				yield result.response;
			}
		},
	};
}

async function* createPagingQueryIterator<TResponsePayload extends JsonValue, TMeta, TExtraProps, TPagingExtraProps, TError>(
	data: Omit<Parameters<typeof fetchAllPages<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>>[0], "pageIndex">,
): AsyncGenerator<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TError>> {
	let nextPageState: NextPageState = { hasNextPage: true, pageSource: "firstRequest" };
	let pageIndex: number = 0;

	while (isNextPageAvailable(nextPageState)) {
		const urlToUse: string | URL = nextPageState?.nextPageUrl ?? data.url;

		const fetchResult = await createFetchQuery<TResponsePayload, TMeta, TExtraProps, TError>({
			...data,
			url: urlToUse,
			continuationToken: nextPageState.continuationToken,
		}).fetchSafe();

		if (!fetchResult.success) {
			yield { success: false, error: fetchResult.error };
			return;
		}

		yield fetchResult;

		pageIndex++;
		nextPageState = resolveNextPageState({
			getNextPageData: data.getNextPageData,
			paginationConfig: data.paginationConfig,
			pageIndex: pageIndex,
			response: fetchResult.response,
		});
	}
}

function resolveNextPageState<TResponsePayload extends JsonValue, TMeta, TExtraProps>({
	paginationConfig,
	getNextPageData,
	pageIndex,
	response,
}: {
	readonly getNextPageData: ExtractNextPageDataFn<TResponsePayload, TMeta, TExtraProps>;
	readonly paginationConfig: PaginationConfig;
	readonly pageIndex: number;
	readonly response: QueryResponse<TResponsePayload, TMeta, TExtraProps>;
}): NextPageState {
	const { maxPagesCount } = paginationConfig;

	if (maxPagesCount && maxPagesCount > 0 && maxPagesCount === pageIndex) {
		return { hasNextPage: false };
	}

	return match(getNextPageData(response))
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
		.otherwise(() => ({ hasNextPage: false }));
}

async function fetchAllPages<TResponsePayload extends JsonValue, TMeta, TExtraProps, TPagingExtraProps, TError>(
	data: Omit<PagingQueryInputData<TResponsePayload, null, TMeta, TExtraProps, TPagingExtraProps, TError>, "nextPageState"> & {
		readonly getNextPageData: ExtractNextPageDataFn<TResponsePayload, TMeta, TExtraProps>;
		readonly paginationConfig: PaginationConfig;
		readonly pageIndex: number;
	},
): Promise<PagingQueryPromiseResult<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>> {
	const responses: QueryResponse<TResponsePayload, TMeta, TExtraProps>[] = [];

	for await (const result of createPagingQueryIterator<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>(data)) {
		if (!result.success) {
			return { success: false, error: result.error, partialResponses: responses } as PagingQueryPromiseResult<
				TResponsePayload,
				TMeta,
				TExtraProps,
				TPagingExtraProps,
				TError
			>;
		}

		responses.push(result.response);
	}

	return {
		success: true,
		responses,
		...data.mapPagingExtraResponseProps(responses),
	};
}

function isNextPageAvailable(nextPageState: NextPageState): nextPageState is NextPageStateWithRequest {
	return nextPageState.hasNextPage;
}
