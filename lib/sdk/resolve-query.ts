/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */
import type { ZodType } from "zod";
import type { HttpRequestBody, HttpService } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { Header, KnownHeaderName, SdkInfo } from "../models/core.models.js";
import type { ErrorDetailsFor, KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { createAuthorizationHeader, createContinuationHeader, extractContinuationToken, getSdkIdHeader } from "../utils/header.utils.js";
import { type Failure, type TryCatchResult, tryCatch } from "../utils/try-catch.utils.js";
import type {
	BaseUrl,
	QueryInputData,
	QueryInspection,
	QueryResponse,
	ResolvedQueryData,
	SafeQueryResponse,
	SdkConfig,
	SuccessfulHttpResponse,
} from "./sdk-models.js";

export function prepareQueryData<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError>(
	data: QueryInputData<TResponsePayload, TRequestBody, TMeta, TError>,
): TryCatchResult<ResolvedQueryData<TResponsePayload, TRequestBody, TMeta, TError>, TError> {
	const { success: inspectionSuccess, data: inspectionData, error: inspectionError } = inspectQuery(data);

	if (!inspectionSuccess) {
		return { success: false, error: inspectionError };
	}

	return {
		success: true,
		data: {
			requestHeaders: inspectionData.requestHeaders,
			url: inspectionData.url,
			httpService: getHttpService(data.config),
			body: data.body,
			method: data.method,
			abortSignal: data.abortSignal,
			zodSchema: data.zodSchema,
			responseValidation: data.config.responseValidation,
			mapError: data.mapError,
			mapMetadata: data.mapMetadata,
		},
	};
}

export function inspectQuery<TError>(
	data: Pick<
		QueryInputData<JsonValue, HttpRequestBody, unknown, TError>,
		"url" | "config" | "requestHeaders" | "continuationToken" | "authorizationApiKey" | "sdkInfo" | "body" | "method" | "mapError"
	>,
): TryCatchResult<QueryInspection, TError> {
	const { success, data: resolvedUrl, error } = resolveUrl({ url: data.url, baseUrl: data.config.baseUrl, mapError: data.mapError });

	if (!success) {
		return { success: false, error };
	}

	return {
		success: true,
		data: {
			url: resolvedUrl,
			requestHeaders: getCombinedRequestHeaders({
				requestHeaders: data.requestHeaders ?? [],
				continuationToken: data.continuationToken,
				authorizationApiKey: data.authorizationApiKey,
				sdkInfo: data.sdkInfo,
			}),
			body: data.body,
			method: data.method,
		},
	};
}

export async function resolveQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError>({
	url,
	requestHeaders,
	httpService,
	body,
	method,
	abortSignal,
	zodSchema,
	responseValidation,
	mapError,
	mapMetadata,
}: ResolvedQueryData<TResponsePayload, TRequestBody, TMeta, TError>): Promise<
	SafeQueryResponse<QueryResponse<TResponsePayload, TMeta>, TError>
> {
	const { success, response, error } = await httpService.request<TResponsePayload, TRequestBody>({
		body,
		url,
		method,
		abortSignal,
		requestHeaders,
	});

	if (!success) {
		return { success: false, error: mapError(error) };
	}

	if (responseValidation?.enable) {
		const validationError = await validateResponse({ url: response.adapterResponse.url, response, zodSchema });

		if (validationError) {
			return { success: false, error: mapError(validationError.error) };
		}
	}

	const continuationTokenFromResponse = extractContinuationToken(response.adapterResponse.responseHeaders);

	return {
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
}

export function resolveUrl<TError>({
	url,
	baseUrl,
	mapError,
}: {
	readonly url: string | URL;
	readonly baseUrl: BaseUrl | undefined;
	readonly mapError: (error: KontentSdkError<ErrorDetailsFor<"invalidUrl">>) => TError;
}): TryCatchResult<URL, TError> {
	const returnWithBaseUrl = (parsedUrl: URL): TryCatchResult<URL, TError> => {
		if (!baseUrl) {
			return {
				success: true,
				data: parsedUrl,
			};
		}
		const { success, data: parsedUrlWithBaseUrl, error } = setBaseUrl(parsedUrl, baseUrl);
		if (!success) {
			return {
				success: false,
				error: mapError(error),
			};
		}
		return {
			success: true,
			data: parsedUrlWithBaseUrl,
		};
	};

	if (typeof url === "string") {
		const { success, data: parsedUrl, error } = tryCatch(() => new URL(url));

		if (!success) {
			return {
				success: false,
				error: mapError(createInvalidUrlError(url, error)),
			};
		}

		return returnWithBaseUrl(parsedUrl);
	}

	return returnWithBaseUrl(url);
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

function setBaseUrl(url: URL, baseUrl: BaseUrl): TryCatchResult<URL, KontentSdkError<ErrorDetailsFor<"invalidUrl">>> {
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
	readonly url: URL;
	readonly response: SuccessfulHttpResponse<TResponsePayload, TRequestBody>;
	readonly zodSchema: ZodType<TResponsePayload>;
}): Promise<Failure<{ readonly response?: never }, KontentSdkError> | undefined> {
	const { success, error } = await zodSchema.safeParseAsync(response.payload);

	if (!success) {
		return {
			success: false,
			error: createSdkError({
				baseErrorData: {
					message: `Failed to validate response schema for url '${url.toString()}'`,
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
	readonly sdkInfo: SdkInfo;
}): readonly Header[] {
	return [
		getSdkIdHeader(sdkInfo),
		...requestHeaders.filter((header) => header.name !== ("X-KC-SDKID" satisfies KnownHeaderName)),
		...(continuationToken ? [createContinuationHeader(continuationToken)] : []),
		...(authorizationApiKey ? [createAuthorizationHeader(authorizationApiKey)] : []),
	];
}
