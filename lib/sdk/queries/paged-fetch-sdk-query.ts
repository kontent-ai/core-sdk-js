import { match, P } from "ts-pattern";
import type { GetNextPageData, PagingConfig } from "../../http/http.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type {
	FetchQueryRequest,
	PagedFetchQuery,
	PagingQueryInputData,
	PendingNextPageState,
	QueryResponse,
	SafePagingQueryResult,
	SafeQueryResult,
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

type NextPageState = PendingNextPageState | NoNextPageState;

export function createPagedFetchQuery<TResponsePayload extends JsonValue, TMeta, TExtraProps, TPagingExtraProps, TError>(
	data: FetchQueryRequest<TResponsePayload, TMeta, TExtraProps, TError> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta, TExtraProps>;
		readonly mapPagingExtraResponseProps: (
			response: readonly QueryResponse<TResponsePayload, TMeta, TExtraProps>[],
		) => TPagingExtraProps;
	},
): PagedFetchQuery<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError> {
	const getPagingData: (
		config: PagingConfig | undefined,
	) => Parameters<typeof fetchAllPages<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>>[0] = (config) => {
		return {
			...data,
			method: "GET",
			pageIndex: 0,
			pagingConfig: config ?? {},
			body: null,
		};
	};

	const fetchQuery = createFetchQuery<TResponsePayload, TMeta, TExtraProps, TError>(data);

	return {
		schema: fetchQuery.schema,
		inspect: () => fetchQuery.inspect(),
		fetchPage: async () => await fetchQuery.fetch(),
		fetchPageSafe: async () => await fetchQuery.fetchSafe(),
		fetchAllPages: async (config?: PagingConfig) => {
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
		fetchAllPagesSafe: async (config?: PagingConfig) =>
			await fetchAllPages<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>(getPagingData(config)),
		pagesSafe: (config?: PagingConfig) =>
			createPagingQueryIterator<TResponsePayload, TMeta, TExtraProps, TPagingExtraProps, TError>(getPagingData(config)),
		pages: async function* (config?: PagingConfig) {
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
): AsyncGenerator<SafeQueryResult<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TError>> {
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
			pagingConfig: data.pagingConfig,
			pageIndex: pageIndex,
			response: fetchResult.response,
		});
	}
}

function resolveNextPageState<TResponsePayload extends JsonValue, TMeta, TExtraProps>({
	pagingConfig,
	getNextPageData,
	pageIndex,
	response,
}: {
	readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta, TExtraProps>;
	readonly pagingConfig: PagingConfig;
	readonly pageIndex: number;
	readonly response: QueryResponse<TResponsePayload, TMeta, TExtraProps>;
}): NextPageState {
	const { maxPagesCount } = pagingConfig;

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
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta, TExtraProps>;
		readonly pagingConfig: PagingConfig;
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

function isNextPageAvailable(nextPageState: NextPageState): nextPageState is PendingNextPageState {
	return nextPageState.hasNextPage;
}
