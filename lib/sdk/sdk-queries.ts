/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { ZodError, ZodType } from "zod";
import type { HttpService } from "../http/http.models.js";
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

export function getQuery<TPayload extends JsonValue, TBodyData extends JsonValue, TExtraMetadata>(
	data: Parameters<typeof resolveQueryAsync<TPayload, TBodyData, TExtraMetadata>>[0],
): Pick<Query<TPayload, TExtraMetadata>, "toPromise"> {
	return {
		toPromise: async () => {
			return await resolveQueryAsync<TPayload, TBodyData, TExtraMetadata>(data);
		},
	};
}

export function getPagingQuery<TPayload extends JsonValue, TBodyData extends JsonValue, TExtraMetadata = EmptyObject>(
	data: Parameters<typeof resolveQueryAsync<TPayload, TBodyData, TExtraMetadata>>[0] & {
		readonly canFetchNextResponse: (response: SdkResponse<TPayload, TExtraMetadata>) => boolean;
		readonly continuationToken: string;
	},
): Pick<PagingQuery<TPayload, TExtraMetadata>, "toPromise" | "toAllPromise"> {
	return {
		...getQuery<TPayload, TBodyData, TExtraMetadata>(data),
		toAllPromise: async () => {
			return await resolvePagingQueryAsync<TPayload, TBodyData, TExtraMetadata>(data);
		},
	};
}

export function extractContinuationToken(responseHeaders: readonly Header[]): string | undefined {
	return responseHeaders.find((header) => header.name.toLowerCase() === ("X-Continuation" satisfies ContinuationHeaderName).toLowerCase())
		?.value;
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
			host: "npmjs.com",
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
	data: Parameters<typeof getPagingQuery<TPayload, TBodyData, TExtraMetadata>>[0],
): Promise<ResolveToAllPromiseQuery<TPayload, TExtraMetadata>> {
	const responses: SdkResponse<TPayload, TExtraMetadata>[] = [];
	let nextContinuationToken: string | undefined = data.continuationToken;

	while (nextContinuationToken?.length) {
		const { success, response, error } = await getQuery<TPayload, TBodyData, TExtraMetadata>({
			...data,
			continuationToken: nextContinuationToken,
		}).toPromise();

		if (success) {
			responses.push(response);

			if (data.canFetchNextResponse(response)) {
				nextContinuationToken = response.meta.continuationToken;
			} else {
				nextContinuationToken = undefined;
			}
		} else {
			return {
				success: false,
				error: error,
			};
		}
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
	continuationToken,
	sdkInfo,
	authorizationApiKey,
}: {
	readonly continuationToken: string | undefined;
	readonly request: Parameters<HttpService["requestAsync"]>[number] & { readonly body: TBodyData };
	readonly extraMetadata: (response: SuccessfulHttpResponse<TPayload, TBodyData>, data: MetadataContextData) => TExtraMetadata;
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TPayload>;
	readonly sdkInfo: SDKInfo;
	readonly authorizationApiKey: string | undefined;
}): ResolveToPromiseQuery<TPayload, TExtraMetadata> {
	const { success, response, error } = await getHttpService(config).requestAsync<TPayload, TBodyData>({
		...request,
		requestHeaders: getCombinedRequestHeaders({
			requestHeaders: request.requestHeaders ?? [],
			continuationToken,
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
