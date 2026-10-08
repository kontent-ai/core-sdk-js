import { match, P } from "ts-pattern";
import type { SafeHttpResult } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { type TryCatchResult, unwrapOrThrow } from "../../utils/try-catch.utils.js";
import { resolveQuery } from "../resolve-query.js";
import type { FetchQueryRequest, GetNextPageData, PagedFetchQuery, PagingConfig, QueryResponse } from "../sdk-models.js";
import { unwrapResults } from "../sdk-utils.js";
import { createFetchQuery } from "./fetch-sdk-query.js";

type PagingInput<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra> = FetchQueryRequest<
	TPayload,
	TError,
	TMeta,
	TExtra
> & {
	readonly getNextPageData: GetNextPageData<TPayload, TMeta, TExtra>;
	readonly pagingConfig: PagingConfig;
};

type NextPage =
	| {
			readonly continuationToken?: string;
			readonly nextPageUrl?: string;
	  }
	| undefined;

export function createPagedFetchQuery<TPayload extends JsonValue, TError extends KontentSdkError, TMeta, TExtra, TPagingExtra>(
	data: FetchQueryRequest<TPayload, TError, TMeta, TExtra> & {
		readonly getNextPageData: GetNextPageData<TPayload, TMeta, TExtra>;
		readonly mapPagingExtraResponseProps: (response: readonly QueryResponse<TPayload, TMeta, TExtra>[]) => TPagingExtra;
	},
): PagedFetchQuery<TPayload, TError, TMeta, TExtra, TPagingExtra> {
	const getPagingData = (config?: PagingConfig): PagingInput<TPayload, TError, TMeta, TExtra> => ({
		...data,
		pagingConfig: config ?? {},
	});

	const fetchQuery = createFetchQuery<TPayload, TError, TMeta, TExtra>(data);

	const fetchAllPagesSafe = async (config?: PagingConfig) => {
		const { success, data: responses, error } = await fetchAllPageResponses<TPayload, TMeta, TExtra, TError>(getPagingData(config));
		if (!success) {
			return { success: false as const, error };
		}
		return { ...data.mapPagingExtraResponseProps(responses), success: true as const, responses };
	};

	const pagesSafe = (config?: PagingConfig) => createPagingQueryIterator<TPayload, TMeta, TExtra, TError>(getPagingData(config));

	return {
		inspect: fetchQuery.inspect,
		fetchPage: fetchQuery.fetch,
		fetchPageSafe: fetchQuery.fetchSafe,
		fetchAllPages: async (config?: PagingConfig) => {
			const { data: responses } = unwrapOrThrow(await fetchAllPageResponses<TPayload, TMeta, TExtra, TError>(getPagingData(config)));
			return { ...data.mapPagingExtraResponseProps(responses), responses };
		},
		fetchAllPagesSafe,
		pagesSafe,
		pages: (config?: PagingConfig) => unwrapResults(pagesSafe(config)),
	};
}

async function* createPagingQueryIterator<TPayload extends JsonValue, TMeta, TExtra, TError extends KontentSdkError>(
	data: PagingInput<TPayload, TError, TMeta, TExtra>,
): AsyncGenerator<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>> {
	let nextPage: NextPage = {};
	let pageIndex: number = 0;

	while (nextPage) {
		const fetchResult: SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError> = await resolveQuery<
			TPayload,
			null,
			TMeta,
			TExtra,
			TError
		>({
			...data,
			method: "GET",
			body: null,
			url: nextPage.nextPageUrl ?? data.url,
			continuationToken: nextPage.continuationToken,
		});

		if (!fetchResult.success) {
			yield { success: false, error: fetchResult.error };
			return;
		}

		yield fetchResult;

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

async function fetchAllPageResponses<TPayload extends JsonValue, TMeta, TExtra, TError extends KontentSdkError>(
	data: PagingInput<TPayload, TError, TMeta, TExtra>,
): Promise<TryCatchResult<readonly QueryResponse<TPayload, TMeta, TExtra>[], TError>> {
	const responses: QueryResponse<TPayload, TMeta, TExtra>[] = [];

	for await (const result of createPagingQueryIterator<TPayload, TMeta, TExtra, TError>(data)) {
		if (!result.success) {
			return { success: false, error: result.error };
		}

		responses.push(result.response);
	}

	return { success: true, data: responses };
}
