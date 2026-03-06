/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { ZodType } from "zod";
import type { HttpRequestBody, HttpService } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { Header, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { createAuthorizationHeader, createContinuationHeader, findHeaderByName, getSdkIdHeader } from "../utils/header.utils.js";
import type { NextPageStateWithRequest, Query, SdkConfig, SuccessfulHttpResponse } from "./sdk-models.js";

export type QueryPromiseResult<TResponsePayload extends JsonValue, TMeta> = ReturnType<
	Pick<Query<TResponsePayload, TMeta>, "toPromise">["toPromise"]
>;

type MetadataContextData = {
	readonly continuationToken: string | undefined;
};

type MetadataMapper<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = (
	response: SuccessfulHttpResponse<TResponsePayload, TRequestBody>,
	data: MetadataContextData,
) => TMeta;
type MetadataMapperConfig<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = {
	readonly mapMetadata: MetadataMapper<TResponsePayload, TRequestBody, TMeta>;
};

export type ResolveQueryData<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = {
	readonly nextPageState: NextPageStateWithRequest;
	readonly request: Parameters<HttpService["requestAsync"]>[number] & { readonly body: TRequestBody };
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly sdkInfo: SDKInfo;
	readonly authorizationApiKey: string | undefined;
} & MetadataMapperConfig<TResponsePayload, TRequestBody, TMeta>;

export function createQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "continuationToken" | "nextPageState" | "pageIndex">,
): Pick<Query<TResponsePayload, TMeta>, "toPromise" | "schema"> {
	return {
		schema: data.zodSchema,
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

export function extractContinuationToken(responseHeaders: readonly Header[]): string | undefined {
	return findHeaderByName(responseHeaders, "X-Continuation")?.value;
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
		getSdkIdHeader(sdkInfo),
		...requestHeaders,
		...(continuationToken ? [createContinuationHeader(continuationToken)] : []),
		...(authorizationApiKey ? [createAuthorizationHeader(authorizationApiKey)] : []),
	];
}

export async function resolveQueryAsync<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>({
	config,
	request,
	mapMetadata,
	zodSchema,
	sdkInfo,
	authorizationApiKey,
	nextPageState,
}: ResolveQueryData<TResponsePayload, TRequestBody, TMeta>): QueryPromiseResult<TResponsePayload, TMeta> {
	const urlToUse = nextPageState?.nextPageUrl ?? request.url;

	const { success, response, error } = await getHttpService(config).requestAsync<TResponsePayload, TRequestBody>({
		body: request.body,
		url: urlToUse,
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
		const { success: validationSuccess, error: validationError } = await zodSchema.safeParseAsync(response.payload);

		if (!validationSuccess) {
			return {
				success: false,
				error: createSdkError({
					baseErrorData: {
						message: `Failed to validate response schema for url '${urlToUse}'`,
						url: urlToUse,
						retryStrategyOptions: undefined,
						retryAttempt: undefined,
					},
					details: {
						reason: "validationFailed",
						zodError: validationError,
						response,
						url: urlToUse,
					},
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
