/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import { match, P } from "ts-pattern";
import type { ZodError, ZodType } from "zod";
import type { GetNextPageData, HttpService, PaginationConfig, RequestBody } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, ContinuationHeaderName, Header, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { EmptyObject } from "../models/utility.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { getSdkIdHeader } from "../utils/header.utils.js";
import type { PagingQuery, PagingQueryResult, Query, QueryResponse, SdkConfig, SuccessfulHttpResponse } from "./sdk-models.js";

type QueryPromiseResult<TResponsePayload extends JsonValue, TMeta = EmptyObject> = ReturnType<
	Pick<Query<TResponsePayload, TMeta>, "toPromise">["toPromise"]
>;

type PagingQueryPromiseResult<TResponsePayload extends JsonValue, TMeta = EmptyObject> = ReturnType<
	Pick<PagingQuery<TResponsePayload, TMeta>, "toAllPromise">["toAllPromise"]
>;

type MetadataContextData = {
	readonly continuationToken?: string;
};

type MetadataMapper<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta> = (
	response: SuccessfulHttpResponse<TResponsePayload, TRequestBody>,
	data: MetadataContextData,
) => TMeta;
type MetadataMapperConfig<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta> = {
	readonly mapMetadata: MetadataMapper<TResponsePayload, TRequestBody, TMeta>;
};
type ResolveQueryData<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta> = {
	readonly nextPageState: NextPageStateWithRequest;
	readonly request: Parameters<HttpService["requestAsync"]>[number] & { readonly body: TRequestBody };
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly sdkInfo: SDKInfo;
	readonly authorizationApiKey: string | undefined;
} & MetadataMapperConfig<TResponsePayload, TRequestBody, TMeta>;

type NoNextPageState = {
	readonly hasNextPage: false;
};

type NextPageStateWithRequest =
	| {
			readonly pageSource: "continuationToken";
			readonly hasNextPage: true;
			readonly continuationToken: string;
			readonly nextPageUrl?: never;
	  }
	| {
			readonly pageSource: "nextPageUrl";
			readonly hasNextPage: true;
			readonly continuationToken?: never;
			readonly nextPageUrl: string;
	  }
	| {
			readonly pageSource: "firstRequest";
			readonly hasNextPage: true;
			readonly continuationToken?: never;
			readonly nextPageUrl?: never;
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

export function createQuery<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "continuationToken" | "nextPageState" | "pageIndex">,
): Pick<Query<TResponsePayload, TMeta>, "toPromise"> {
	return {
		toPromise: async () => {
			return await resolveQueryAsync<TResponsePayload, TRequestBody, TMeta>({
				...data,
				nextPageState: {
					hasNextPage: true,
					pageSource: "firstRequest",
				},
			});
		},
	};
}

export function createPagingQuery<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "nextPageState" | "pageIndex"> & {
		readonly getNextPageData: GetNextPageData<TResponsePayload, TMeta>;
	},
): Pick<PagingQuery<TResponsePayload, TMeta>, "toPromise" | "toAllPromise"> {
	return {
		...createQuery<TResponsePayload, TRequestBody, TMeta>(data),
		toAllPromise: async (config: PaginationConfig) => {
			return await resolvePagingQueryAsync<TResponsePayload, TRequestBody, TMeta>({
				...data,
				pageIndex: 0,
				paginationConfig: config,
			});
		},
	};
}

export function extractContinuationToken(responseHeaders: readonly Header[]): string | undefined {
	return responseHeaders.find((header) => header.name.toLowerCase() === ("X-Continuation" satisfies ContinuationHeaderName).toLowerCase())
		?.value;
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

function getHttpService(config: SdkConfig) {
	return config.httpService ?? getDefaultHttpService();
}

function getCombinedRequestHeaders({
	requestHeaders,
	continuationToken,
	authorizationApiKey,
	sdkInfo,
}: {
	readonly requestHeaders: readonly Header[];
	readonly continuationToken: string | undefined;
	readonly authorizationApiKey: string | undefined;
	readonly sdkInfo: SDKInfo;
}): readonly Header[] {
	return [
		getSdkIdHeader({
			host: sdkInfo.host,
			name: sdkInfo.name,
			version: sdkInfo.version,
		}),
		...requestHeaders,
		...(continuationToken
			? [
					{
						name: "X-Continuation" satisfies CommonHeaderNames,
						value: continuationToken,
					},
				]
			: []),
		...(authorizationApiKey
			? [
					{
						name: "Authorization" satisfies CommonHeaderNames,
						value: `Bearer ${authorizationApiKey}`,
					},
				]
			: []),
	];
}

async function resolvePagingQueryAsync<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
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

async function fetchAllPagesAsync<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
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

async function fetchAllPagesInternal<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>({
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

async function resolveQueryAsync<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta>({
	config,
	request,
	mapMetadata,
	zodSchema,
	sdkInfo,
	authorizationApiKey,
	nextPageState,
}: ResolveQueryData<TResponsePayload, TRequestBody, TMeta>): QueryPromiseResult<TResponsePayload, TMeta> {
	const { success, response, error } = await getHttpService(config).requestAsync<TResponsePayload, TRequestBody>({
		body: request.body,
		url: nextPageState?.nextPageUrl ?? request.url,
		method: request.method,
		requestHeaders: getCombinedRequestHeaders({
			requestHeaders: request.requestHeaders ?? [],
			continuationToken: nextPageState?.continuationToken,
			authorizationApiKey: authorizationApiKey,
			sdkInfo,
		}),
	});

	if (!success) {
		return {
			success: false,
			error,
		};
	}

	if (config.responseValidation?.enable) {
		const { isValid, error: validationError } = await validateResponseSchemaAsync(response.payload, zodSchema);
		if (!isValid) {
			return {
				success: false,
				error: createSdkError({
					message: `Failed to validate response schema for url '${request.url}'`,
					reason: "validationFailed",
					zodError: validationError,
					response,
					url: request.url,
				}),
			};
		}
	}

	const continuationTokenFromResponse = extractContinuationToken(response.adapterResponse.responseHeaders);

	const result: Awaited<QueryPromiseResult<TResponsePayload, TMeta>> = {
		success: true,
		response: {
			payload: response.payload,
			meta: {
				url: response.adapterResponse.url,
				responseHeaders: response.adapterResponse.responseHeaders,
				status: response.adapterResponse.status,
				continuationToken: continuationTokenFromResponse,
				...mapMetadata(response, { continuationToken: continuationTokenFromResponse }),
			},
		},
	};

	return result;
}

async function validateResponseSchemaAsync<TResponsePayload extends JsonValue>(
	payload: TResponsePayload,
	zodSchema: ZodType<TResponsePayload>,
): Promise<
	| {
			readonly isValid: true;
			readonly error?: never;
	  }
	| {
			readonly isValid: false;
			readonly error: ZodError;
	  }
> {
	const validateResult = await zodSchema.safeParseAsync(payload);

	if (validateResult.success) {
		return {
			isValid: true,
		};
	}

	return {
		isValid: false,
		error: validateResult.error,
	};
}

function isNextPageAvailable(nextPageState: NextPageState): nextPageState is NextPageStateWithRequest {
	return nextPageState.hasNextPage;
}
