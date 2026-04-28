import { match, P } from "ts-pattern";
import type { GetNextPageData, PagingConfig } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
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

type PagingQueryPromiseResult<TPayload extends JsonValue, TMeta, TExtra, TPagingExtra, TError> = SafePagingQueryResult<
	QueryResponse<TPayload, TMeta, TExtra>,
	TError,
	TPagingExtra
>;

type NoNextPageState = {
	readonly hasNextPage: false;
};

type NextPageState = PendingNextPageState | NoNextPageState;

export function createPagedFetchQuery<
	TPayload extends JsonValue,
	TError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
	TPagingExtra = unknown,
>(
	data: FetchQueryRequest<TPayload, TError, TMeta, TExtra> & {
		readonly getNextPageData: GetNextPageData<TPayload, TMeta, TExtra>;
		readonly mapPagingExtraResponseProps: (response: readonly QueryResponse<TPayload, TMeta, TExtra>[]) => TPagingExtra;
	},
): PagedFetchQuery<TPayload, TError, TMeta, TExtra, TPagingExtra> {
	const getPagingData: (
		config: PagingConfig | undefined,
	) => Parameters<typeof fetchAllPages<TPayload, TMeta, TExtra, TPagingExtra, TError>>[0] = (config) => {
		return {
			...data,
			method: "GET",
			pageIndex: 0,
			pagingConfig: config ?? {},
			body: null,
		};
	};

	const fetchQuery = createFetchQuery<TPayload, TError, TMeta, TExtra>(data);

	return {
		schema: fetchQuery.schema,
		inspect: () => fetchQuery.inspect(),
		fetchPage: async () => await fetchQuery.fetch(),
		fetchPageSafe: async () => await fetchQuery.fetchSafe(),
		fetchAllPages: async (config?: PagingConfig) => {
			const { success, error, partialResponses, responses } = await fetchAllPages<TPayload, TMeta, TExtra, TPagingExtra, TError>(
				getPagingData(config),
			);
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
			await fetchAllPages<TPayload, TMeta, TExtra, TPagingExtra, TError>(getPagingData(config)),
		pagesSafe: (config?: PagingConfig) =>
			createPagingQueryIterator<TPayload, TMeta, TExtra, TPagingExtra, TError>(getPagingData(config)),
		pages: async function* (config?: PagingConfig) {
			const iterator = createPagingQueryIterator<TPayload, TMeta, TExtra, TPagingExtra, TError>(getPagingData(config));
			for await (const result of iterator) {
				if (!result.success) {
					throw result.error;
				}
				yield result.response;
			}
		},
	};
}

async function* createPagingQueryIterator<TPayload extends JsonValue, TMeta, TExtra, TPagingExtra, TError>(
	data: Omit<Parameters<typeof fetchAllPages<TPayload, TMeta, TExtra, TPagingExtra, TError>>[0], "pageIndex">,
): AsyncGenerator<SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>> {
	let nextPageState: NextPageState = { hasNextPage: true, pageSource: "firstRequest" };
	let pageIndex: number = 0;

	while (isNextPageAvailable(nextPageState)) {
		const urlToUse: string | URL = nextPageState?.nextPageUrl ?? data.url;

		const fetchResult = await createFetchQuery<TPayload, TError, TMeta, TExtra>({
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

function resolveNextPageState<TPayload extends JsonValue, TMeta, TExtra>({
	pagingConfig,
	getNextPageData,
	pageIndex,
	response,
}: {
	readonly getNextPageData: GetNextPageData<TPayload, TMeta, TExtra>;
	readonly pagingConfig: PagingConfig;
	readonly pageIndex: number;
	readonly response: QueryResponse<TPayload, TMeta, TExtra>;
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

async function fetchAllPages<TPayload extends JsonValue, TMeta, TExtra, TPagingExtra, TError>(
	data: Omit<PagingQueryInputData<TPayload, null, TMeta, TExtra, TPagingExtra, TError>, "nextPageState"> & {
		readonly getNextPageData: GetNextPageData<TPayload, TMeta, TExtra>;
		readonly pagingConfig: PagingConfig;
		readonly pageIndex: number;
	},
): Promise<PagingQueryPromiseResult<TPayload, TMeta, TExtra, TPagingExtra, TError>> {
	const responses: QueryResponse<TPayload, TMeta, TExtra>[] = [];

	for await (const result of createPagingQueryIterator<TPayload, TMeta, TExtra, TPagingExtra, TError>(data)) {
		if (!result.success) {
			return { success: false, error: result.error, partialResponses: responses } as PagingQueryPromiseResult<
				TPayload,
				TMeta,
				TExtra,
				TPagingExtra,
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
