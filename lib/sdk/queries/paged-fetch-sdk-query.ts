import { match, P } from "ts-pattern";
import type { SafeHttpResult } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { type TryCatchResult, unwrapOrThrow } from "../../utils/try-catch.utils.js";
import { resolveQuery } from "../resolve-query.js";
import type {
	FetchQueryRequest,
	GetNextPageData,
	PagedFetchQuery,
	PagingConfig,
	PagingQueryResponse,
	QueryResponse,
} from "../sdk-models.js";
import { unwrapResults } from "../sdk-utils.js";
import { createFetchQuery } from "./fetch-sdk-query.js";

type PagedQueryBaseInput<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra> = FetchQueryRequest<
	TPayload,
	TError,
	TMeta,
	TExtra
> & {
	readonly getNextPageData: GetNextPageData<TPayload, TMeta, TExtra>;
};

type PagedFetchQueryInput<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra, TPagingExtra> = PagedQueryBaseInput<
	TPayload,
	TError,
	TMeta,
	TExtra
> & {
	readonly mapPagingExtraResponseProps: (responses: readonly QueryResponse<TPayload, TMeta, TExtra>[]) => TPagingExtra;
};

type PagingInput<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra> = PagedQueryBaseInput<
	TPayload,
	TError,
	TMeta,
	TExtra
> & {
	readonly pagingConfig: PagingConfig;
};

type NextPage =
	| {
			readonly continuationToken?: string;
			readonly nextPageUrl?: string;
	  }
	| undefined;

export function createPagedFetchQuery<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra, TPagingExtra>(
	data: PagedFetchQueryInput<TPayload, TError, TMeta, TExtra, TPagingExtra>,
): PagedFetchQuery<TPayload, TError, TMeta, TExtra, TPagingExtra> {
	const getPagingData = (config?: PagingConfig): PagingInput<TPayload, TError, TMeta, TExtra> => ({
		...data,
		pagingConfig: config ?? {},
	});

	const fetchQuery = createFetchQuery(data);

	const toResponseWithExtraProps = (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	): PagingQueryResponse<QueryResponse<TPayload, TMeta, TExtra>, TPagingExtra> => ({
		...data.mapPagingExtraResponseProps(responses),
		responses,
	});

	const fetchAllPagesSafe = async (config?: PagingConfig) => {
		const { success, data: responses, error } = await fetchAllPageResponses(getPagingData(config));
		if (!success) {
			return { success: false as const, error };
		}
		return { ...toResponseWithExtraProps(responses), success: true as const };
	};

	const pagesSafe = (config?: PagingConfig) => createPagingQueryIterator(getPagingData(config));

	return {
		inspect: fetchQuery.inspect,
		fetchPage: fetchQuery.fetch,
		fetchPageSafe: fetchQuery.fetchSafe,
		fetchAllPages: async (config?: PagingConfig) =>
			toResponseWithExtraProps(unwrapOrThrow(await fetchAllPageResponses(getPagingData(config))).data),
		fetchAllPagesSafe,
		pagesSafe,
		pages: (config?: PagingConfig) => unwrapResults(pagesSafe(config)),
	};
}

async function* createPagingQueryIterator<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra>(
	data: PagingInput<TPayload, TError, TMeta, TExtra>,
): AsyncGenerator<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>> {
	let nextPage: NextPage = {};
	let pageIndex: number = 0;

	while (nextPage) {
		const fetchResult: SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError> = await resolveQuery({
			...data,
			method: "GET",
			body: null,
			url: nextPage.nextPageUrl ?? data.url,
			continuationToken: nextPage.continuationToken,
		});

		yield fetchResult;

		// stop iterator when response failed
		if (!fetchResult.success) {
			return;
		}

		pageIndex++;
		nextPage = resolveNextPage({
			getNextPageData: data.getNextPageData,
			pagingConfig: data.pagingConfig,
			pageIndex,
			response: fetchResult.response,
		});
	}
}

function resolveNextPage<TPayload extends JsonValue, TMeta, TExtra>({
	pagingConfig,
	getNextPageData,
	pageIndex,
	response,
}: {
	readonly getNextPageData: GetNextPageData<TPayload, TMeta, TExtra>;
	readonly pagingConfig: PagingConfig;
	readonly pageIndex: number;
	readonly response: QueryResponse<TPayload, TMeta, TExtra>;
}): NextPage {
	const { maxPagesCount } = pagingConfig;

	if (maxPagesCount && maxPagesCount > 0 && pageIndex >= maxPagesCount) {
		return undefined;
	}

	return match(getNextPageData(response))
		.returnType<NextPage>()
		.with({ continuationToken: P.string.minLength(1) }, ({ continuationToken }) => ({ continuationToken }))
		.with({ nextPageUrl: P.string.minLength(1) }, ({ nextPageUrl }) => ({ nextPageUrl }))
		.otherwise(() => undefined);
}

async function fetchAllPageResponses<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra>(
	data: PagingInput<TPayload, TError, TMeta, TExtra>,
): Promise<TryCatchResult<readonly QueryResponse<TPayload, TMeta, TExtra>[], TError>> {
	const responses: QueryResponse<TPayload, TMeta, TExtra>[] = [];

	for await (const result of createPagingQueryIterator(data)) {
		if (!result.success) {
			return { success: false, error: result.error };
		}

		responses.push(result.response);
	}

	return { success: true, data: responses };
}
