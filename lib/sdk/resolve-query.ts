/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { ZodType } from "zod";
import type { HttpRequestBody, HttpService } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, Header, SDKInfo } from "../models/core.models.js";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { createAuthorizationHeader, createContinuationHeader, extractContinuationToken, getSdkIdHeader } from "../utils/header.utils.js";
import { type Failure, tryCatch } from "../utils/try-catch.utils.js";
import type { QueryPromiseResult, ResolveQueryData, SdkConfig, SuccessfulHttpResponse } from "./sdk-models.js";

export async function resolveQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>({
	config,
	request,
	mapMetadata,
	zodSchema,
	sdkInfo,
	method,
	abortSignal,
}: ResolveQueryData<TResponsePayload, TRequestBody, TMeta>): QueryPromiseResult<TResponsePayload, TMeta> {
	const urlToUse = config.baseUrl ? setBaseUrl(request.url, config.baseUrl) : request.url;
	const { success, response, error } = await getHttpService(config).request<TResponsePayload, TRequestBody>({
		body: request.body,
		url: urlToUse,
		method,
		abortSignal,
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
		const validationError = await validateResponse({ url: response.adapterResponse.url, response, zodSchema });

		if (validationError) {
			return validationError;
		}
	}

	const continuationTokenFromResponse = extractContinuationToken(response.adapterResponse.responseHeaders);

	const result: Awaited<QueryPromiseResult<TResponsePayload, TMeta>> = {
		success: true,
		response: {
			payload: response.payload,
			meta: {
				...mapMetadata(response, { continuationToken: continuationTokenFromResponse }),
				url: response.adapterResponse.url,
				responseHeaders: response.adapterResponse.responseHeaders,
				status: response.adapterResponse.status,
				continuationToken: continuationTokenFromResponse,
			},
		},
	};

	return result;
}

/**
 * We are intentionally not throwing errors here as parsing errors are handled by the HttpService.
 */
function setBaseUrl(url: string, baseUrl: string): string {
	const { success, data: parsedUrl } = tryCatch(() => new URL(url));

	if (!success) {
		return url;
	}

	if (baseUrl.startsWith("http")) {
		const { success, data: parsedBaseUrl } = tryCatch(() => new URL(baseUrl));

		if (!success) {
			return url;
		}

		parsedUrl.host = parsedBaseUrl.host;
		parsedUrl.protocol = parsedBaseUrl.protocol;

		return parsedUrl.toString();
	}

	parsedUrl.host = baseUrl;

	return parsedUrl.toString();
}

async function validateResponse<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody>({
	url,
	response,
	zodSchema,
}: {
	readonly url: string;
	readonly response: SuccessfulHttpResponse<TResponsePayload, TRequestBody>;
	readonly zodSchema: ZodType<TResponsePayload>;
}): Promise<Failure<{ readonly response?: never }, KontentSdkError> | undefined> {
	const { success, error } = await zodSchema.safeParseAsync(response.payload);

	if (!success) {
		return {
			success: false,
			error: createSdkError({
				baseErrorData: {
					message: `Failed to validate response schema for url '${url}'`,
					url,
					retryStrategyOptions: undefined,
					retryAttempt: undefined,
				},
				details: {
					reason: "validationFailed",
					zodError: error,
					response,
					url,
				},
			}),
		};
	}

	return undefined;
}

function getHttpService(config: SdkConfig): HttpService {
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
		...requestHeaders.filter((header) => header.name !== ("X-KC-SDKID" satisfies CommonHeaderNames)),
		...(continuationToken ? [createContinuationHeader(continuationToken)] : []),
		...(authorizationApiKey ? [createAuthorizationHeader(authorizationApiKey)] : []),
	];
}
