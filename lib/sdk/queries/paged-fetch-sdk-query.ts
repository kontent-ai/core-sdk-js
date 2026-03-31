import { match, P } from "ts-pattern";
import type { GetNextPageData, PaginationConfig } from "../../http/http.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { KontentSdkError } from "../../public_api.js";
import { createSdkError } from "../../utils/error.utils.js";
import type {
	FetchQueryRequest,
	NextPageStateWithRequest,
	PagedFetchQuery,
	QueryResponse,
	QueryResult,
	ResolveQueryData,
	SafePagingQueryResult,
} from "../sdk-models.js";
import { createFetchQuery } from "./fetch-sdk-query.js";

type PagingQueryPromiseResult<TResponsePayload extends JsonValue, TMeta, TError> = Promise<
	SafePagingQueryResult<QueryResponse<TResponsePayload, TMeta>, TError>
>;

type NoNextPageState = {
	readonly hasNextPage: false;
};

type NextPageState = NextPageStateWithRequest | NoNextPageState;

export function createPagedFetchQuery<TResponsePayload extends JsonValue, TMeta, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TError> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
	},
): PagedFetchQuery<TResponsePayload, TMeta, TError> {
	const getPagingData: (config: PaginationConfig | undefined) => Parameters<typeof fetchAllPages<TResponsePayload, TMeta, TError>>[0] = (
		config,
	) => {
		return {
			...data,
			method: "GET",
			pageIndex: 0,
			paginationConfig: config ?? {},
			request: {
				...data.request,
				body: null,
			},
		};
	};

	const fetchQuery = createFetchQuery<TResponsePayload, TMeta, TError>(data);

	return {
		schema: fetchQuery.schema,
		url: fetchQuery.url,
		fetchPage: async () => await fetchQuery.fetch(),
		fetchPageSafe: async () => await fetchQuery.fetchSafe(),
		fetchAllPages: async (config?: PaginationConfig) => {
			const { success, error, lastContinuationToken, partialResponses, responses } = await fetchAllPages<
				TResponsePayload,
				TMeta,
				TError
			>(getPagingData(config));
			if (!success) {
				throw error;
			}
			return {
				lastContinuationToken,
				responses,
				partialResponses,
			};
		},
		fetchAllPagesSafe: async (config?: PaginationConfig) => await fetchAllPages<TResponsePayload, TMeta, TError>(getPagingData(config)),
		pagesSafe: (config?: PaginationConfig) => createPagingQueryIterator<TResponsePayload, TMeta, TError>(getPagingData(config)),
		pages: async function* (config?: PaginationConfig) {
			const iterator = createPagingQueryIterator<TResponsePayload, TMeta, TError>(getPagingData(config));
			for await (const result of iterator) {
				if (!result.success) {
					throw result.error;
				}
				yield result.response;
			}
		},
	};
}

async function* createPagingQueryIterator<TResponsePayload extends JsonValue, TMeta, TError>(
	data: Omit<Parameters<typeof fetchAllPages<TResponsePayload, TMeta, TError>>[0], "pageIndex">,
): AsyncGenerator<QueryResult<QueryResponse<TResponsePayload, TMeta>, TError>> {
	let nextPageState: NextPageState = { hasNextPage: true, pageSource: "firstRequest" };
	let pageIndex: number = 0;

	while (isNextPageAvailable(nextPageState)) {
		const urlToUse: string = nextPageState?.nextPageUrl ?? data.request.url;

		const { success, response, error } = await createFetchQuery<TResponsePayload, TMeta, TError>({
			...data,
			request: {
				...data.request,
				url: urlToUse,
				continuationToken: nextPageState.continuationToken,
			},
		}).fetchSafe();

		if (!success) {
			yield { success: false, error };
			return;
		}

		yield { success: true, response };

		pageIndex++;
		nextPageState = resolveNextPageState({
			getNextPageData: data.getNextPageData,
			paginationConfig: data.paginationConfig,
			pageIndex: pageIndex,
			response,
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

async function fetchAllPages<TResponsePayload extends JsonValue, TMeta, TError>(
	data: Omit<ResolveQueryData<TResponsePayload, null, TMeta, TError>, "nextPageState"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
		readonly paginationConfig: PaginationConfig;
		readonly pageIndex: number;
	},
): Promise<PagingQueryPromiseResult<TResponsePayload, TMeta, TError>> {
	const responses: QueryResponse<TResponsePayload, TMeta>[] = [];

	for await (const result of createPagingQueryIterator<TResponsePayload, TMeta, TError>(data)) {
		if (!result.success) {
			return { success: false, error: result.error, partialResponses: responses };
		}

		responses.push(result.response);
	}

	return validateAndBuildPagingResult<TResponsePayload, TMeta, TError>({
		responses,
		initialUrl: data.request.url,
		mapError: data.mapError,
	});
}

function validateAndBuildPagingResult<TResponsePayload extends JsonValue, TMeta, TError>({
	responses,
	initialUrl,
	mapError,
}: {
	readonly responses: readonly QueryResponse<TResponsePayload, TMeta>[];
	readonly initialUrl: string;
	readonly mapError: (error: KontentSdkError) => TError;
}): Awaited<PagingQueryPromiseResult<TResponsePayload, TMeta, TError>> {
	const lastResponse = responses.at(-1);

	if (!lastResponse) {
		return {
			success: false,
			partialResponses: responses,
			error: mapError(
				createSdkError({
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
			),
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
