/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { ZodError, ZodType } from "zod";
import type { HttpService, Pagination } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, ContinuationHeaderName, Header, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { EmptyObject } from "../models/utility.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { getSdkIdHeader } from "../utils/header.utils.js";
import type { PagingQuery, Query, SdkConfig, SdkResponse, SuccessfulHttpResponse } from "./sdk-models.js";

type ResolveToPromiseQuery<TPayload extends JsonValue, TExtraMetadata = EmptyObject> = ReturnType<
	Pick<Query<TPayload, TExtraMetadata>, "toPromise">["toPromise"]
>;

type ResolveToAllPromiseQuery<TPayload extends JsonValue, TExtraMetadata = EmptyObject> = ReturnType<
	Pick<PagingQuery<TPayload, TExtraMetadata>, "toAllPromise">["toAllPromise"]
>;

type MetadataContextData = {
	readonly continuationToken?: string;
};

type InvalidNextPageData = {
	readonly canFetchNextResponse: false;
};

type ValidNextPageData =
	| {
			readonly fetchBy: "continuationToken";
			readonly canFetchNextResponse: true;
			readonly continuationToken: string;
			readonly nextPageUrl?: never;
	  }
	| {
			readonly fetchBy: "nextPageUrl";
			readonly canFetchNextResponse: true;
			readonly continuationToken?: never;
			readonly nextPageUrl: string;
	  }
	| {
			readonly fetchBy: "firstRequest";
			readonly canFetchNextResponse: true;
			readonly continuationToken?: never;
			readonly nextPageUrl?: never;
	  };

type NextPageData = ValidNextPageData | InvalidNextPageData;

export function getQuery<TPayload extends JsonValue, TBodyData extends JsonValue, TExtraMetadata = EmptyObject>(
	data: Omit<
		Parameters<typeof resolveQueryAsync<TPayload, TBodyData, TExtraMetadata>>[0],
		"continuationToken" | "pagination" | "pageIndex"
	>,
): Pick<Query<TPayload, TExtraMetadata>, "toPromise"> {
	return {
		toPromise: async () => {
			return await resolveQueryAsync<TPayload, TBodyData, TExtraMetadata>({
				...data,
				pagination: {
					canFetchNextResponse: true,
					fetchBy: "firstRequest",
				},
			});
		},
	};
}

export function getPagingQuery<TPayload extends JsonValue, TBodyData extends JsonValue, TExtraMetadata = EmptyObject>(
	data: Omit<Parameters<typeof resolveQueryAsync<TPayload, TBodyData, TExtraMetadata>>[0], "pagination" | "pageIndex"> & {
		readonly pagination: Pagination<TPayload, TExtraMetadata>;
	},
): Pick<PagingQuery<TPayload, TExtraMetadata>, "toPromise" | "toAllPromise"> {
	return {
		...getQuery<TPayload, TBodyData, TExtraMetadata>(data),
		toAllPromise: async () => {
			return await resolvePagingQueryAsync<TPayload, TBodyData, TExtraMetadata>({
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

function getNextPageData<TPayload extends JsonValue, TExtraMetadata>({
	pagination,
	pageIndex,
	response,
}: {
	readonly pagination: Pagination<TPayload, TExtraMetadata>;
	readonly pageIndex: number;
	readonly response: SdkResponse<TPayload, TExtraMetadata> | undefined;
}): NextPageData {
	if (pagination.config?.maxPagesCount === 0) {
		return {
			canFetchNextResponse: false,
		};
	}

	if (pagination.config?.maxPagesCount && pagination.config.maxPagesCount > pageIndex) {
		return {
			canFetchNextResponse: false,
		};
	}

	if (!response) {
		return {
			canFetchNextResponse: true,
			fetchBy: "firstRequest",
		};
	}

	const nextPageData = pagination.getNextPageData(response);

	if (nextPageData.continuationToken) {
		return {
			canFetchNextResponse: true,
			fetchBy: "continuationToken",
			continuationToken: nextPageData.continuationToken,
		};
	}

	if (nextPageData.nextPageUrl) {
		return {
			canFetchNextResponse: true,
			fetchBy: "nextPageUrl",
			nextPageUrl: nextPageData.nextPageUrl,
		};
	}

	return {
		canFetchNextResponse: false,
	};
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

async function resolvePagingQueryAsync<TPayload extends JsonValue, TBodyData extends JsonValue, TExtraMetadata = EmptyObject>(
	data: Parameters<typeof getQuery<TPayload, TBodyData, TExtraMetadata>>[0] & {
		readonly pagination: Pagination<TPayload, TExtraMetadata>;
		readonly pageIndex: number;
	},
): Promise<ResolveToAllPromiseQuery<TPayload, TExtraMetadata>> {
	const responses: SdkResponse<TPayload, TExtraMetadata>[] = [];
	let nextPageData: NextPageData = getNextPageData({ pagination: data.pagination, pageIndex: data.pageIndex, response: undefined });

	while (isValidNextPage(nextPageData)) {
		const { success, response, error } = await resolveQueryAsync<TPayload, TBodyData, TExtraMetadata>({
			...data,
			pagination: nextPageData,
		});

		if (!success) {
			return {
				success: false,
				error: error,
			};
		}

		responses.push(response);

		nextPageData = getNextPageData({
			pagination: data.pagination,
			pageIndex: data.pageIndex + 1,
			response: response,
		});
	}

	const lastResponse: SdkResponse<TPayload, TExtraMetadata> | undefined = responses.at(-1);

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

async function resolveQueryAsync<TPayload extends JsonValue, TBodyData extends JsonValue, TExtraMetadata>({
	config,
	request,
	extraMetadata,
	zodSchema,
	sdkInfo,
	authorizationApiKey,
	pagination,
}: {
	readonly pagination: ValidNextPageData;
	readonly request: Parameters<HttpService["requestAsync"]>[number] & { readonly body: TBodyData };
	readonly extraMetadata: (response: SuccessfulHttpResponse<TPayload, TBodyData>, data: MetadataContextData) => TExtraMetadata;
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TPayload>;
	readonly sdkInfo: SDKInfo;
	readonly authorizationApiKey: string | undefined;
}): ResolveToPromiseQuery<TPayload, TExtraMetadata> {
	const { success, response, error } = await getHttpService(config).requestAsync<TPayload, TBodyData>({
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
		const { isValid, error: validationError } = await validateResponseAsync(response.data, zodSchema);
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

	const result: Awaited<ResolveToPromiseQuery<TPayload, TExtraMetadata>> = {
		success: true,
		response: {
			payload: response.data,
			meta: {
				url: response.adapterResponse.url,
				responseHeaders: response.adapterResponse.responseHeaders,
				status: response.adapterResponse.status,
				continuationToken: continuationTokenFromResponse,
				...extraMetadata(response, { continuationToken: continuationTokenFromResponse }),
			},
		},
	};

	return result;
}

async function validateResponseAsync<TPayload extends JsonValue>(
	data: TPayload,
	zodSchema: ZodType<TPayload>,
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

function isValidNextPage(nextPageData: NextPageData | undefined): nextPageData is ValidNextPageData {
	return nextPageData?.canFetchNextResponse ?? false;
}
