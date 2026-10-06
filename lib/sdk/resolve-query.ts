import type { HttpRequestBody, HttpService } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { Header, SdkInfo } from "../models/core.models.js";
import type { ErrorDetailsFor, KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import {
	createAuthorizationHeader,
	createContinuationHeader,
	createSdkIdHeader,
	extractContinuationToken,
	isSameHeaderName,
} from "../utils/header.utils.js";
import type { TryCatchResult } from "../utils/try-catch.utils.js";
import { parseUrl } from "../utils/url.utils.js";
import type {
	BaseUrl,
	QueryInputData,
	QueryInspection,
	QueryResponse,
	ResolvedQueryData,
	SafeQueryResult,
	SdkConfig,
} from "./sdk-models.js";
import { validatePayloads } from "./sdk-utils.js";

export function inspectQuery<TError>(
	data: Pick<
		QueryInputData<JsonValue, HttpRequestBody, unknown, unknown, TError>,
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

export async function resolveQuery<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TExtra, TError>(
	data: QueryInputData<TPayload, TBody, TMeta, TExtra, TError>,
): Promise<SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>> {
	const { success, data: resolvedQueryData, error } = prepareQueryData(data);
	if (!success) {
		return { success: false, error };
	}
	return await executeQuery(resolvedQueryData);
}

function prepareQueryData<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TExtra, TError>(
	data: QueryInputData<TPayload, TBody, TMeta, TExtra, TError>,
): TryCatchResult<ResolvedQueryData<TPayload, TBody, TMeta, TExtra, TError>, TError> {
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
			schema: data.schema,
			responseValidation: data.config.runtimeValidation,
			mapError: data.mapError,
			mapMetadata: data.mapMetadata,
			mapExtraResponseProps: data.mapExtraResponseProps,
		},
	};
}

async function executeQuery<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TExtra, TError>({
	url,
	requestHeaders,
	httpService,
	body,
	method,
	abortSignal,
	schema,
	responseValidation,
	mapError,
	mapMetadata,
	mapExtraResponseProps,
}: ResolvedQueryData<TPayload, TBody, TMeta, TExtra, TError>): Promise<SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>> {
	const { success, response, error } = await httpService.request<TPayload, TBody>({
		body,
		url,
		method,
		abortSignal,
		requestHeaders,
	});

	if (!success) {
		return { success: false, error: mapError(error) };
	}

	const validationError = await validatePayloads({
		runtimeValidation: responseValidation,
		schema,
		payloads: [{ url: response.adapterResponse.url, payload: response.payload }],
	});
	if (validationError) {
		return { success: false, error: mapError(validationError) };
	}

	const continuationTokenFromResponse = extractContinuationToken(response.adapterResponse.responseHeaders);

	return {
		success: true,
		response: {
			...mapExtraResponseProps(response),
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
	const { success, data: parsedUrl, error } = parseUrl(url);

	if (!success) {
		return { success: false, error: mapError(error) };
	}

	if (!baseUrl) {
		return { success: true, data: parsedUrl };
	}

	const { success: baseUrlSuccess, data: urlWithBaseUrl, error: baseUrlError } = setBaseUrl(parsedUrl, baseUrl);

	if (!baseUrlSuccess) {
		return { success: false, error: mapError(baseUrlError) };
	}

	return { success: true, data: urlWithBaseUrl };
}

function setBaseUrl(url: URL, baseUrl: BaseUrl): TryCatchResult<URL, KontentSdkError<ErrorDetailsFor<"invalidUrl">>> {
	// Direct host assignment is a silent no-op for invalid values per the URL spec,
	// so validate by constructing a full URL first.
	const { success, data: parsedBaseUrl, error } = parseUrl(`${baseUrl.protocol}://${baseUrl.host}`);

	if (!success) {
		return { success: false, error };
	}

	const clonedUrl = new URL(url.toString());
	clonedUrl.protocol = parsedBaseUrl.protocol;
	clonedUrl.host = parsedBaseUrl.host;

	return { success: true, data: clonedUrl };
}

// shared by all queries without a custom http service, so it is not rebuilt for every query (or page)
const defaultHttpService = getDefaultHttpService();

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
	readonly sdkInfo: SdkInfo;
}): readonly Header[] {
	// headers managed by the SDK always take precedence over request headers with the same name
	const sdkHeaders: readonly Header[] = [
		createSdkIdHeader(sdkInfo),
		...(continuationToken ? [createContinuationHeader(continuationToken)] : []),
		...(authorizationApiKey ? [createAuthorizationHeader(authorizationApiKey)] : []),
	];

	return [
		...requestHeaders.filter((header) => !sdkHeaders.some((sdkHeader) => isSameHeaderName(header.name, sdkHeader.name))),
		...sdkHeaders,
	];
}
