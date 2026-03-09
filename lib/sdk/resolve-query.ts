/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { HttpRequestBody } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { Header, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { createAuthorizationHeader, createContinuationHeader, getSdkIdHeader } from "../utils/header.utils.js";
import type { QueryPromiseResult, ResolveQueryData, SdkConfig } from "./sdk-models.js";
import { extractContinuationToken } from "./sdk-utils.js";

export async function resolveQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>({
	config,
	request,
	mapMetadata,
	zodSchema,
	sdkInfo,
	method,
}: ResolveQueryData<TResponsePayload, TRequestBody, TMeta>): QueryPromiseResult<TResponsePayload, TMeta> {
	const { success, response, error } = await getHttpService(config).request<TResponsePayload, TRequestBody>({
		body: request.body,
		url: request.url,
		method,
		requestHeaders: getCombinedRequestHeaders({
			requestHeaders: request.requestHeaders ?? [],
			continuationToken: request.continuationToken,
			authorizationApiKey: request.authorizationApiKey,
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
						message: `Failed to validate response schema for url '${request.url}'`,
						url: request.url,
						retryStrategyOptions: undefined,
						retryAttempt: undefined,
					},
					details: {
						reason: "validationFailed",
						zodError: validationError,
						response,
						url: request.url,
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
