/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import { match, P } from "ts-pattern";
import type { ZodError, ZodType } from "zod";
import type { HttpService, Pagination, RequestBody } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, ContinuationHeaderName, Header, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { EmptyObject } from "../models/utility.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { getSdkIdHeader } from "../utils/header.utils.js";
import type { PagingQuery, Query, QueryResponse, SdkConfig, SuccessfulHttpResponse } from "./sdk-models.js";

type QueryPromiseResult<TResponseData extends JsonValue, TMeta = EmptyObject> = ReturnType<
	Pick<Query<TResponseData, TMeta>, "toPromise">["toPromise"]
>;

type PagingQueryPromiseResult<TResponseData extends JsonValue, TMeta = EmptyObject> = ReturnType<
	Pick<PagingQuery<TResponseData, TMeta>, "toAllPromise">["toAllPromise"]
>;

type MetadataContextData = {
	readonly continuationToken?: string;
};

type MetadataMapper<TResponseData extends JsonValue, TRequestBody extends RequestBody, TMeta> = (
	response: SuccessfulHttpResponse<TResponseData, TRequestBody>,
	data: MetadataContextData,
) => TMeta;
type MetadataMapperConfig<TResponseData extends JsonValue, TRequestBody extends RequestBody, TMeta> = {
	readonly mapMetadata: MetadataMapper<TResponseData, TRequestBody, TMeta>;
};
type ResolveQueryData<TResponseData extends JsonValue, TRequestBody extends RequestBody, TMeta> = {
	readonly pagination: NextPageStateWithRequest;
	readonly request: Parameters<HttpService["requestAsync"]>[number] & { readonly body: TRequestBody };
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TResponseData>;
	readonly sdkInfo: SDKInfo;
	readonly authorizationApiKey: string | undefined;
} & MetadataMapperConfig<TResponseData, TRequestBody, TMeta>;

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

export function createQuery<TResponseData extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
	data: Omit<ResolveQueryData<TResponseData, TRequestBody, TMeta>, "continuationToken" | "pagination" | "pageIndex">,
): Pick<Query<TResponseData, TMeta>, "toPromise"> {
	return {
		toPromise: async () => {
			return await resolveQueryAsync<TResponseData, TRequestBody, TMeta>({
				...data,
				pagination: {
					hasNextPage: true,
					pageSource: "firstRequest",
				},
			});
		},
	};
}

export function createPagingQuery<TResponseData extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
	data: Omit<ResolveQueryData<TResponseData, TRequestBody, TMeta>, "pagination" | "pageIndex"> & {
		readonly pagination: Pagination<TResponseData, TMeta>;
	},
): Pick<PagingQuery<TResponseData, TMeta>, "toPromise" | "toAllPromise"> {
	return {
		...createQuery<TResponseData, TRequestBody, TMeta>(data),
		toAllPromise: async () => {
			return await resolvePagingQueryAsync<TResponseData, TRequestBody, TMeta>({
				...data,
				pageIndex: 0,
			});
		},
	};
}

export function extractContinuationToken(responseHeaders: readonly Header[]): string | undefined {
	return responseHeaders.find((header) => header.name.toLowerCase() === ("X-Continuation" satisfies ContinuationHeaderName).toLowerCase())
		?.value;
}

function resolveNextPageState<TResponseData extends JsonValue, TMeta>({
	pagination,
	pageIndex,
	response,
}: {
	readonly pagination: Pagination<TResponseData, TMeta>;
	readonly pageIndex: number;
	readonly response: QueryResponse<TResponseData, TMeta> | undefined;
}): NextPageState {
	return match({ pagination, pageIndex, response })
		.returnType<NextPageState>()
		.with({ response: undefined }, () => ({
			hasNextPage: true,
			pageSource: "firstRequest",
		}))
		.with({ pagination: { config: { maxPagesCount: 0 } } }, () => ({
			hasNextPage: false,
		}))
		.with({ pagination: { config: { maxPagesCount: pageIndex } } }, () => ({
			hasNextPage: false,
		}))
		.with({ response: P.not(undefined) }, (m) => {
			const responsePageData = m.pagination.getNextPageData(m.response);

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

async function resolvePagingQueryAsync<TResponseData extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
	data: Omit<ResolveQueryData<TResponseData, TRequestBody, TMeta>, "pagination"> & {
		readonly pagination: Pagination<TResponseData, TMeta>;
		readonly pageIndex: number;
	},
): Promise<PagingQueryPromiseResult<TResponseData, TMeta>> {
	const responses: QueryResponse<TResponseData, TMeta>[] = [];
	let nextPageState: NextPageState = resolveNextPageState({
		pagination: data.pagination,
		pageIndex: data.pageIndex,
		response: undefined,
	});

	while (isNextPageAvailable(nextPageState)) {
		const { success, response, error } = await resolveQueryAsync<TResponseData, TRequestBody, TMeta>({
			...data,
			pagination: nextPageState,
		});

		if (!success) {
			return {
				success: false,
				error: error,
			};
		}

		responses.push(response);

		nextPageState = resolveNextPageState({
			pagination: data.pagination,
			pageIndex: responses.length,
			response: response,
		});
	}

	const lastResponse: QueryResponse<TResponseData, TMeta> | undefined = responses.at(-1);

	if (!lastResponse) {
		return {
			success: false,
			error: createSdkError({
				reason: "noResponses",
				url: data.request.url,
				message: "No responses were processed. Expected at least one response to be fetched when using paging queries.",
			}),
		};
	}

	return {
		success: true,
		responses: responses,
		lastContinuationToken: lastResponse.meta.continuationToken,
	};
}

async function resolveQueryAsync<TResponseData extends JsonValue, TRequestBody extends RequestBody, TMeta>({
	config,
	request,
	mapMetadata,
	zodSchema,
	sdkInfo,
	authorizationApiKey,
	pagination,
}: ResolveQueryData<TResponseData, TRequestBody, TMeta>): QueryPromiseResult<TResponseData, TMeta> {
	const { success, response, error } = await getHttpService(config).requestAsync<TResponseData, TRequestBody>({
		body: request.body,
		url: pagination?.nextPageUrl ?? request.url,
		method: request.method,
		requestHeaders: getCombinedRequestHeaders({
			requestHeaders: request.requestHeaders ?? [],
			continuationToken: pagination?.continuationToken,
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
		const { isValid, error: validationError } = await validateResponseSchemaAsync(response.data, zodSchema);
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

	const result: Awaited<QueryPromiseResult<TResponseData, TMeta>> = {
		success: true,
		response: {
			data: response.data,
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

async function validateResponseSchemaAsync<TResponseData extends JsonValue>(
	data: TResponseData,
	zodSchema: ZodType<TResponseData>,
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
	const validateResult = await zodSchema.safeParseAsync(data);

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
