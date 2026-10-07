import { match, P } from "ts-pattern";
import { coreSdkInfo } from "../core-sdk-info.js";
import type { Header, HttpMethod, KnownHeaderName, ResolvedRetryStrategyOptions } from "../models/core.models.js";
import type { ErrorDetails, ErrorDetailsFor, ErrorReason, ErrorResponseData, KontentSdkError } from "../models/error.models.js";
import type { JsonObject, JsonValue } from "../models/json.models.js";
import type { PickStringLiteral } from "../models/utility.types.js";
import { isBlob, isDefined } from "../utils/core.utils.js";
import {
	createSdkError,
	isAdapterAbortError,
	isAdapterParseError,
	isKontentErrorResponseData,
	isKontentSdkError,
	toInvalidResponseMessage,
} from "../utils/error.utils.js";
import {
	binaryContentType,
	createSdkIdHeader,
	findHeaderByName,
	isApplicationJsonResponseType,
	jsonContentType,
} from "../utils/header.utils.js";
import { resolveDefaultRetryStrategyOptions, runWithRetry } from "../utils/retry.utils.js";
import { type TryCatchResult, tryCatch, tryCatchAsync } from "../utils/try-catch.utils.js";
import { parseUrl, type RetryContext } from "../utils/url.utils.js";
import { getDefaultHttpAdapter } from "./http.adapter.js";
import type {
	AdapterPayload,
	AdapterRequestBody,
	AdapterRequestOptions,
	AdapterResponse,
	DefaultHttpServiceOptions,
	DownloadFileRequestOptions,
	HttpAdapter,
	HttpRequestBody,
	HttpResponse,
	HttpService,
	HttpServiceRequestOptions,
	UploadFileRequestOptions,
} from "./http.models.js";

type ParsedRequest = {
	readonly parsedUrl: URL;
	readonly parsedBody: AdapterRequestBody;
	readonly requestHeaders: readonly Header[];
};

export function getDefaultHttpService(config?: DefaultHttpServiceOptions): HttpService {
	const adapter = resolveHttpAdapter(config);
	const retryStrategyOptions = resolveDefaultRetryStrategyOptions(config?.retryStrategy);

	return {
		request: async <TBody extends HttpRequestBody>(
			options: HttpServiceRequestOptions<TBody>,
		): Promise<HttpResponse<JsonValue, TBody>> => {
			return await processHttpRequest<JsonValue, TBody>({
				config,
				retryStrategyOptions,
				options,
				runAdapterFunc: adapter.executeRequest,
			});
		},

		downloadFile: async (options: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
			return await processHttpRequest<Blob, null>({
				config,
				retryStrategyOptions,
				options: {
					...options,
					method: "GET",
				},
				runAdapterFunc: adapter.downloadFile,
			});
		},

		uploadFile: async (options: UploadFileRequestOptions): Promise<HttpResponse<JsonValue, Blob>> => {
			return await processHttpRequest<JsonValue, Blob>({
				config,
				retryStrategyOptions,
				options,
				runAdapterFunc: adapter.executeRequest,
			});
		},
	};
}

function resolveHttpAdapter(config?: DefaultHttpServiceOptions): Required<HttpAdapter> {
	const defaultAdapter = getDefaultHttpAdapter();

	return {
		downloadFile: config?.adapter?.downloadFile ?? defaultAdapter.downloadFile,
		executeRequest: config?.adapter?.executeRequest ?? defaultAdapter.executeRequest,
	};
}

async function processHttpRequest<TPayload extends AdapterPayload, TBody extends HttpRequestBody>({
	options,
	runAdapterFunc,
	config,
	retryStrategyOptions,
}: {
	readonly runAdapterFunc: (options: AdapterRequestOptions) => Promise<AdapterResponse<TPayload>>;
	readonly config: DefaultHttpServiceOptions | undefined;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly options: HttpServiceRequestOptions<TBody>;
}): Promise<HttpResponse<TPayload, TBody>> {
	const { success, data: parsedRequest, error } = parseAndValidateRequest({ options, retryStrategyOptions, config });

	if (!success) {
		return {
			success: false,
			error: error,
		};
	}

	const adapterOptions: AdapterRequestOptions = {
		url: parsedRequest.parsedUrl,
		method: options.method,
		requestHeaders: parsedRequest.requestHeaders,
		body: parsedRequest.parsedBody,
		abortSignal: options.abortSignal,
	};

	return await runWithRetry({
		abortSignal: options.abortSignal,
		func: async (retryAttempt) => {
			const retryContext: RetryContext = { retryStrategyOptions, retryAttempt };
			const responseOrError = await runAdapterRequest({
				adapterOptions,
				runAdapterFunc,
				retryContext,
			});

			if (isKontentSdkError(responseOrError)) {
				return {
					success: false,
					error: responseOrError,
				};
			}

			return await mapAdapterResponse({
				retryContext,
				method: options.method,
				requestHeaders: parsedRequest.requestHeaders,
				response: responseOrError,
				...(options.body === undefined ? {} : { requestBody: options.body }),
			});
		},
		url: parsedRequest.parsedUrl,
		retryStrategyOptions,
	});
}

function createAdapterError({
	url,
	error,
	retryContext,
}: {
	readonly url: URL;
	readonly error: unknown;
	readonly retryContext: RetryContext;
}): KontentSdkError<ErrorDetailsFor<"adapterError" | "aborted" | "invalidResponseBody">> {
	const { message, details } = match(error)
		.returnType<{
			readonly message: string;
			readonly details: ErrorDetailsFor<"adapterError" | "aborted" | "invalidResponseBody">;
		}>()
		.when(isAdapterAbortError, (abortError) => ({
			message: `Adapter has aborted the request for url '${url.toString()}'. See the error object for more details.`,
			details: { reason: "aborted", originalError: abortError },
		}))
		.when(isAdapterParseError, (parseError) => ({
			message: `Adapter failed to parse the response for url '${url.toString()}'. See the error object for more details.`,
			details: { reason: "invalidResponseBody", originalError: parseError },
		}))
		.otherwise(() => ({
			message: `Adapter failed to execute the request for url '${url.toString()}'. See the error object for more details.`,
			details: { reason: "adapterError", originalError: error },
		}));

	return createSdkError({
		baseErrorData: { message, url, ...retryContext },
		details,
	});
}

async function mapAdapterResponse<TPayload extends AdapterPayload, TBody extends HttpRequestBody>({
	response,
	method,
	requestHeaders,
	requestBody,
	retryContext,
}: {
	readonly response: AdapterResponse<TPayload>;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly requestBody?: TBody;
	readonly retryContext: RetryContext;
}): Promise<HttpResponse<TPayload, TBody>> {
	if (!isSuccessfulResponse(response)) {
		return {
			success: false,
			error: await createInvalidResponseError({ response, method, retryContext }),
		};
	}

	return {
		success: true,
		response: {
			payload: response.payload,
			method: method,
			adapterResponse: response,
			requestHeaders: requestHeaders,
			...(requestBody === undefined ? {} : { body: requestBody }),
		},
	};
}

async function runAdapterRequest<TPayload extends AdapterPayload>({
	adapterOptions,
	runAdapterFunc,
	retryContext,
}: {
	readonly adapterOptions: AdapterRequestOptions;
	readonly runAdapterFunc: (options: AdapterRequestOptions) => Promise<AdapterResponse<TPayload>>;
	readonly retryContext: RetryContext;
}): Promise<AdapterResponse<TPayload> | KontentSdkError> {
	const { success, error, data } = await tryCatchAsync(async () => await runAdapterFunc(adapterOptions));

	return success ? data : createAdapterError({ url: adapterOptions.url, error, retryContext });
}

function isSuccessfulResponse(response: AdapterResponse<AdapterPayload>): boolean {
	return response.status >= 200 && response.status < 300;
}

async function createInvalidResponseError({
	response,
	method,
	retryContext,
}: {
	readonly response: AdapterResponse<AdapterPayload>;
	readonly method: HttpMethod;
	readonly retryContext: RetryContext;
}): Promise<KontentSdkError> {
	const kontentErrorData = await tryExtractKontentErrorData(response);

	return createSdkError({
		baseErrorData: {
			message: toInvalidResponseMessage({
				adapterResponse: response,
				method: method,
				kontentErrorData: kontentErrorData,
			}),
			url: response.url,
			...retryContext,
		},
		details: extractInvalidResponseErrorDetails({ response, kontentErrorData }),
	});
}

function extractInvalidResponseErrorDetails({
	response,
	kontentErrorData,
}: {
	readonly response: AdapterResponse<AdapterPayload>;
	readonly kontentErrorData: ErrorResponseData | undefined;
}): ErrorDetails {
	const reason = match(response.status)
		.returnType<PickStringLiteral<ErrorReason, "unauthorized" | "notFound" | "invalidResponse">>()
		.with(401, () => "unauthorized")
		.with(404, () => "notFound")
		.otherwise(() => "invalidResponse");

	return {
		reason,
		responseHeaders: response.responseHeaders,
		status: response.status,
		statusText: response.statusText,
		kontentErrorResponse: kontentErrorData,
		adapterResponse: response,
	};
}

function parseRequestBody({
	requestBody,
	url,
	retryContext,
}: {
	readonly requestBody: HttpRequestBody;
	readonly url: URL;
	readonly retryContext: RetryContext;
}): TryCatchResult<AdapterRequestBody, KontentSdkError> {
	return match(requestBody)
		.returnType<TryCatchResult<AdapterRequestBody, KontentSdkError>>()
		.with(P.nullish, () => ({
			success: true,
			data: null,
		}))
		.when(isBlob, (blob) => ({
			success: true,
			data: blob,
		}))
		.otherwise((m) => stringifyJson({ url: url, retryContext, json: m }));
}

function stringifyJson({
	url,
	retryContext,
	json,
}: {
	readonly url: URL;
	readonly retryContext: RetryContext;
	readonly json: JsonObject;
}): TryCatchResult<string, KontentSdkError> {
	const { success, data, error } = tryCatch(() => JSON.stringify(json));

	if (success) {
		return {
			success: true,
			data,
		};
	}

	return {
		success: false,
		error: createSdkError({
			baseErrorData: {
				message: "Failed to stringify body of the request.",
				url: url,
				...retryContext,
			},
			details: {
				reason: "invalidBody",
				originalError: error,
			},
		}),
	};
}

async function tryExtractKontentErrorData(response: AdapterResponse<AdapterPayload>): Promise<ErrorResponseData | undefined> {
	if (!isApplicationJsonResponseType(response.responseHeaders)) {
		return undefined;
	}

	// file downloads are always read as a Blob, so a JSON error body has to be decoded first
	const payload = isBlob(response.payload) ? await parseJsonBlob(response.payload) : response.payload;

	return isKontentErrorResponseData(payload) ? payload : undefined;
}

async function parseJsonBlob(blob: Blob): Promise<unknown> {
	const { data } = await tryCatchAsync(async () => {
		const parsed: unknown = JSON.parse(await blob.text());
		return parsed;
	});
	return data;
}

function parseAndValidateRequest<TBody extends HttpRequestBody>({
	options,
	retryStrategyOptions,
	config,
}: {
	readonly options: HttpServiceRequestOptions<TBody>;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly config: DefaultHttpServiceOptions | undefined;
}): TryCatchResult<ParsedRequest, KontentSdkError> {
	const retryContext: RetryContext = { retryStrategyOptions, retryAttempt: 0 };
	const { success: urlParsedSuccess, data: parsedUrl, error: urlError } = parseUrl(options.url, retryContext);

	if (!urlParsedSuccess) {
		return {
			success: false,
			error: urlError,
		};
	}

	const {
		success: requestBodyParsedSuccess,
		data: parsedRequestBody,
		error: requestBodyError,
	} = parseRequestBody({ requestBody: options.body ?? null, url: parsedUrl, retryContext });

	if (!requestBodyParsedSuccess) {
		return {
			success: false,
			error: requestBodyError,
		};
	}

	return {
		success: true,
		data: {
			parsedUrl,
			parsedBody: parsedRequestBody,
			requestHeaders: buildRequestHeaders({
				configHeaders: config?.requestHeaders,
				optionHeaders: options.requestHeaders,
				body: options.body ?? null,
			}),
		},
	};
}

function buildRequestHeaders({
	configHeaders,
	optionHeaders,
	body,
}: {
	readonly configHeaders: readonly Header[] | undefined;
	readonly optionHeaders: readonly Header[] | undefined;
	readonly body: HttpRequestBody;
}): readonly Header[] {
	const combinedHeaders: readonly Header[] = dedupeHeadersByName([...(configHeaders ?? []), ...(optionHeaders ?? [])]);
	const existingContentTypeHeader = findHeaderByName(combinedHeaders, "Content-Type");
	const existingSdkVersionHeader = findHeaderByName(combinedHeaders, "X-KC-SDKID");

	const contentTypeHeader = match({ existingContentTypeHeader, body })
		.returnType<Header | undefined>()
		.with({ existingContentTypeHeader: P.nullish, body: P.nonNullable }, ({ body }) => createDefaultContentTypeHeader(body))
		.otherwise(() => undefined);
	const sdkVersionHeader = existingSdkVersionHeader ? undefined : createSdkIdHeader(coreSdkInfo);

	const contentLengthHeader = isBlob(body) ? createDefaultContentLengthHeader(body) : undefined;

	return [...combinedHeaders, ...[contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isDefined)];
}

function dedupeHeadersByName(headers: readonly Header[]): readonly Header[] {
	const lastByLowercasedName = new Map(headers.map((header) => [header.name.toLowerCase(), header]));
	return Array.from(lastByLowercasedName.values());
}

function createDefaultContentTypeHeader(body: Blob | JsonValue): Header {
	return {
		name: "Content-Type" satisfies KnownHeaderName,
		value: isBlob(body) ? getBlobContentType(body) : jsonContentType,
	};
}

function getBlobContentType(blob: Blob): string {
	return blob.type === "" ? binaryContentType : blob.type;
}

function createDefaultContentLengthHeader(body: Blob): Header {
	return {
		name: "Content-Length" satisfies KnownHeaderName,
		value: body.size.toString(),
	};
}
