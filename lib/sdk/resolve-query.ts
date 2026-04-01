/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { ZodType } from "zod";
import type { HttpRequestBody, HttpService } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, Header, SDKInfo } from "../models/core.models.js";
import type { ErrorDetailsFor, KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { createAuthorizationHeader, createContinuationHeader, extractContinuationToken, getSdkIdHeader } from "../utils/header.utils.js";
import { type Failure, type TryCatchResult, tryCatch } from "../utils/try-catch.utils.js";
import type { QueryPromiseResult, ResolveQueryData, SdkConfig, SuccessfulHttpResponse } from "./sdk-models.js";

const defaultHttpService = getDefaultHttpService();

export async function resolveQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError>({
	config,
	request,
	mapMetadata,
	zodSchema,
	sdkInfo,
	method,
	abortSignal,
	mapError,
}: ResolveQueryData<TResponsePayload, TRequestBody, TMeta, TError>): QueryPromiseResult<TResponsePayload, TMeta, TError> {
	const { success: urlSuccess, data: urlToUse, error: urlError } = getUrlToUse(request.url, config.baseUrl);

	if (!urlSuccess) {
		return {
			success: false,
			error: mapError(urlError),
		};
	}

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
			error: mapError(error),
		};
	}

	if (config.responseValidation?.enable) {
		const validationError = await validateResponse({ url: response.adapterResponse.url, response, zodSchema });

		if (validationError) {
			return {
				success: false,
				error: mapError(validationError.error),
			};
		}
	}

	const continuationTokenFromResponse = extractContinuationToken(response.adapterResponse.responseHeaders);

	const result: Awaited<QueryPromiseResult<TResponsePayload, TMeta, TError>> = {
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

function getUrlToUse(url: string, baseUrl: string | undefined): TryCatchResult<URL, KontentSdkError<ErrorDetailsFor<"invalidUrl">>> {
	const { success, data: parsedUrl, error } = tryCatch(() => new URL(url));

	if (!success) {
		return {
			success: false,
			error: createInvalidUrlError(url, error),
		};
	}

	if (baseUrl) {
		return setBaseUrl(parsedUrl, baseUrl);
	}

	return {
		success: true,
		data: parsedUrl,
	};
}

function createInvalidUrlError(invalidUrl: string, error: unknown): KontentSdkError<ErrorDetailsFor<"invalidUrl">> {
	return createSdkError({
		baseErrorData: {
			message: `Failed to parse url '${invalidUrl}'`,
			url: invalidUrl,
			retryStrategyOptions: undefined,
			retryAttempt: undefined,
		},
		details: {
			reason: "invalidUrl",
			originalError: error,
		},
	});
}

function setBaseUrl(url: URL, baseUrl: string): TryCatchResult<URL, KontentSdkError<ErrorDetailsFor<"invalidUrl">>> {
	const clonedUrl = new URL(url.toString());

	if (baseUrl.startsWith("http")) {
		const { success, data: parsedBaseUrl, error } = tryCatch(() => new URL(baseUrl));

		if (!success) {
			return {
				success: false,
				error: createInvalidUrlError(baseUrl, error),
			};
		}

		clonedUrl.host = parsedBaseUrl.host;
		clonedUrl.protocol = parsedBaseUrl.protocol;

		return {
			success: true,
			data: clonedUrl,
		};
	}

	// Direct host assignment is a silent no-op for invalid values per the URL spec,
	// so validate by constructing a full URL first.
	const { success, data: parsedHostUrl, error } = tryCatch(() => new URL(`https://${baseUrl}`));

	if (!success) {
		return {
			success: false,
			error: createInvalidUrlError(baseUrl, error),
		};
	}

	clonedUrl.host = parsedHostUrl.host;

	return {
		success: true,
		data: clonedUrl,
	};
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
	return config.httpService ?? defaultHttpService;
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
