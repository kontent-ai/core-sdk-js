import { match, P } from "ts-pattern";
import type { CommonHeaderNames, ErrorResponseData, Header, HttpMethod, ResolvedRetryStrategyOptions } from "../models/core.models.js";
import type { ErrorDetails, KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { sdkInfo } from "../sdk-info.js";
import { isBlob, isNotUndefined } from "../utils/core.utils.js";
import { createSdkError, getErrorMessage, isKontentErrorResponseData } from "../utils/error.utils.js";
import { getSdkIdHeader, isApplicationJsonResponseType } from "../utils/header.utils.js";
import { resolveDefaultRetryStrategyOptions, runWithRetryAsync } from "../utils/retry.utils.js";
import { type Result, tryCatch, tryCatchAsync } from "../utils/try.utils.js";
import { getDefaultHttpAdapter } from "./http.adapter.js";
import type {
	AdapterRequestBody,
	AdapterResponse,
	DefaultHttpServiceConfig,
	DownloadFileRequestOptions,
	ExecuteRequestOptions,
	HttpAdapter,
	HttpResponse,
	HttpService,
	RequestBody,
	ResponseData,
	UploadFileRequestOptions,
} from "./http.models.js";

export function getDefaultHttpService(config?: DefaultHttpServiceConfig): HttpService {
	return {
		requestAsync: async <TResponsePayload extends JsonValue, TRequestBody extends RequestBody>(
			options: ExecuteRequestOptions<TRequestBody>,
		) => {
			return await resolveRequestAsync<TResponsePayload, TRequestBody>({
				config,
				options,
				resolvePayloadAsync: async (response) => {
					return (await response.toJsonAsync()) as TResponsePayload;
				},
			});
		},

		downloadFileAsync: async (options: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
			return await resolveRequestAsync<Blob, null>({
				config,
				options: {
					...options,
					method: "GET",
					body: null,
				},
				resolvePayloadAsync: async (response) => {
					return await response.toBlobAsync();
				},
			});
		},

		uploadFileAsync: async <TResponsePayload extends JsonValue>(
			options: UploadFileRequestOptions,
		): Promise<HttpResponse<TResponsePayload, Blob>> => {
			return await resolveRequestAsync<TResponsePayload, Blob>({
				config,
				options,
				resolvePayloadAsync: async (response) => {
					return (await response.toJsonAsync()) as TResponsePayload;
				},
			});
		},
	};
}

async function resolveRequestAsync<TResponsePayload extends ResponseData, TRequestBody extends RequestBody>({
	options,
	resolvePayloadAsync,
	config,
}: {
	readonly config: DefaultHttpServiceConfig | undefined;
	readonly options: ExecuteRequestOptions<TRequestBody>;
	readonly resolvePayloadAsync: (response: AdapterResponse) => Promise<TResponsePayload>;
}): Promise<HttpResponse<TResponsePayload, TRequestBody>> {
	return await withUnknownErrorHandlingAsync({
		url: options.url,
		funcAsync: async () => {
			return await withRetryAsync({
				funcAsync: async (retryAttempt, retryStrategyOptions) => {
					const {
						success: parseSuccess,
						data: parsedRequest,
						error: parseError,
					} = parseAndValidateRequest(options, retryStrategyOptions);

					if (!parseSuccess) {
						return {
							success: false,
							error: parseError,
						};
					}

					const requestHeaders = buildRequestHeaders({
						configHeaders: config?.requestHeaders,
						optionHeaders: options.requestHeaders,
						body: options.body,
					});

					const adapterResponse = await executeWithAdapter({
						adapter: config?.adapter ?? getDefaultHttpAdapter(),
						parsedUrl: parsedRequest.parsedUrl,
						method: options.method,
						requestHeaders,
						parsedBody: parsedRequest.parsedBody,
					});

					return await resolveResponseAsync({
						retryStrategyOptions,
						method: options.method,
						requestBody: options.body,
						requestHeaders,
						response: adapterResponse,
						resolvePayloadAsync,
						retryAttempt,
					});
				},
				url: options.url,
				retryStrategyOptions: resolveDefaultRetryStrategyOptions(config?.retryStrategy),
			});
		},
	});
}

async function withUnknownErrorHandlingAsync<TResponsePayload extends ResponseData, TRequestBody extends RequestBody>({
	url,
	funcAsync,
}: {
	readonly url: string;
	readonly funcAsync: () => Promise<HttpResponse<TResponsePayload, TRequestBody>>;
}): Promise<HttpResponse<TResponsePayload, TRequestBody>> {
	const { success, data, error } = await tryCatchAsync(funcAsync);

	if (success) {
		return data;
	}

	return {
		success: false,
		error: createSdkError({
			message: "Unknown error. See the error object for more details.",
			url: url,
			reason: "unknown",
			originalError: error,
			retryStrategyOptions: undefined,
			retryAttempt: undefined,
		}),
	};
}

async function resolveResponseAsync<TResponsePayload extends ResponseData, TRequestBody extends RequestBody>({
	response,
	resolvePayloadAsync,
	method,
	requestHeaders,
	requestBody,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly response: AdapterResponse;
	readonly resolvePayloadAsync: (response: AdapterResponse) => Promise<TResponsePayload>;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly requestBody: TRequestBody;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): Promise<HttpResponse<TResponsePayload, TRequestBody>> {
	if (!response.isValidResponse) {
		return {
			success: false,
			error: await getErrorForInvalidResponseAsync({ response, method, retryAttempt, retryStrategyOptions }),
		};
	}

	return {
		success: true,
		response: {
			payload: await resolvePayloadAsync(response),
			body: requestBody,
			method: method,
			adapterResponse: {
				url: response.url,
				isValidResponse: response.isValidResponse,
				responseHeaders: response.responseHeaders,
				status: response.status,
				statusText: response.statusText,
			},
			requestHeaders: requestHeaders,
		},
	};
}

async function executeWithAdapter({
	adapter,
	parsedUrl,
	method,
	requestHeaders,
	parsedBody,
}: {
	readonly adapter: HttpAdapter;
	readonly parsedUrl: URL;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly parsedBody: AdapterRequestBody;
}): Promise<AdapterResponse> {
	return await adapter.requestAsync({
		url: parsedUrl.toString(),
		method,
		requestHeaders,
		body: parsedBody,
	});
}

async function withRetryAsync<TResponsePayload extends ResponseData, TRequestBody extends RequestBody>({
	funcAsync,
	url,
	retryStrategyOptions,
}: {
	readonly funcAsync: (
		retryAttempt: number,
		retryStrategyOptions: ResolvedRetryStrategyOptions,
	) => Promise<HttpResponse<TResponsePayload, TRequestBody>>;
	readonly url: string;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): Promise<HttpResponse<TResponsePayload, TRequestBody>> {
	return await runWithRetryAsync({
		url,
		retryStrategyOptions,
		retryAttempt: 0,
		funcAsync: async (retryAttempt) => {
			return await funcAsync(retryAttempt, retryStrategyOptions);
		},
	});
}

async function getErrorForInvalidResponseAsync({
	response,
	method,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly response: AdapterResponse;
	readonly method: HttpMethod;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): Promise<KontentSdkError> {
	return createSdkError(await getErrorDetailsForInvalidResponseAsync({ response, method, retryAttempt, retryStrategyOptions }));
}

async function getErrorDetailsForInvalidResponseAsync({
	response,
	method,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly response: AdapterResponse;
	readonly method: HttpMethod;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): Promise<ErrorDetails> {
	const sharedErrorData: Pick<ErrorDetails, "message" | "url"> = {
		message: getErrorMessage({
			url: response.url,
			adapterResponse: response,
			method: method,
		}),
		url: response.url,
	};

	return await match(response)
		.returnType<Promise<ErrorDetails>>()
		.with({ status: P.union(401, 404) }, async (m) => ({
			...sharedErrorData,
			reason: m.status === 401 ? "unauthorized" : "notFound",
			isValidResponse: m.isValidResponse,
			responseHeaders: m.responseHeaders,
			status: m.status,
			statusText: m.statusText,
			kontentErrorResponse: await getKontentErrorDataAsync(m),
			retryStrategyOptions,
			retryAttempt,
		}))
		.otherwise(async () => ({
			...sharedErrorData,
			reason: "invalidResponse",
			isValidResponse: response.isValidResponse,
			responseHeaders: response.responseHeaders,
			status: response.status,
			statusText: response.statusText,
			kontentErrorResponse: await getKontentErrorDataAsync(response),
			retryStrategyOptions,
			retryAttempt,
		}));
}

function parseRequestBody({
	requestBody,
	url,
	retryStrategyOptions,
}: {
	readonly requestBody: RequestBody;
	readonly url: string;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): Result<AdapterRequestBody, KontentSdkError> {
	return match(requestBody)
		.returnType<Result<AdapterRequestBody, KontentSdkError>>()
		.with(P.nullish, () => ({
			success: true,
			data: null,
		}))
		.when(isBlob, (blob) => ({
			success: true,
			data: blob,
		}))
		.otherwise((m) => {
			const { success: isParseSuccess, data: parsedBody, error: parseError } = tryCatch(() => JSON.stringify(m));

			if (!isParseSuccess) {
				return {
					success: false,
					error: createSdkError({
						message: "Failed to stringify body of the request.",
						url: url,
						reason: "invalidBody",
						originalError: parseError,
						retryStrategyOptions,
						retryAttempt: undefined,
					}),
				};
			}

			return {
				success: true,
				data: parsedBody,
			};
		});
}

async function getKontentErrorDataAsync(response: AdapterResponse): Promise<ErrorResponseData | undefined> {
	if (isApplicationJsonResponseType(response.responseHeaders)) {
		const json = await response.toJsonAsync();

		if (isKontentErrorResponseData(json)) {
			return json;
		}
	}

	return undefined;
}

type ParsedRequest = {
	readonly parsedUrl: URL;
	readonly parsedBody: AdapterRequestBody;
};

function parseAndValidateRequest<TRequestBody extends RequestBody>(
	options: ExecuteRequestOptions<TRequestBody>,
	retryStrategyOptions: ResolvedRetryStrategyOptions,
): Result<ParsedRequest, KontentSdkError> {
	const { success: urlParsedSuccess, data: parsedUrl, error: urlError } = parseUrl({ url: options.url, retryStrategyOptions });

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
	} = parseRequestBody({ requestBody: options.body, url: options.url, retryStrategyOptions });

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
		},
	};
}

function parseUrl({
	url,
	retryStrategyOptions,
}: {
	readonly url: string;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): Result<URL, KontentSdkError> {
	const { success, data: parsedUrl, error } = tryCatch(() => new URL(url));

	if (!success) {
		return {
			success: false,
			error: createSdkError({
				message: `Failed to parse url '${url}'.`,
				url: url,
				reason: "invalidUrl",
				originalError: error,
				retryStrategyOptions,
				retryAttempt: undefined,
			}),
		};
	}

	return {
		success: true,
		data: parsedUrl,
	};
}

function buildRequestHeaders({
	configHeaders,
	optionHeaders,
	body,
}: {
	readonly configHeaders: readonly Header[] | undefined;
	readonly optionHeaders: readonly Header[] | undefined;
	readonly body: Blob | JsonValue;
}): readonly Header[] {
	const combinedHeaders: readonly Header[] = [...(configHeaders ?? []), ...(optionHeaders ?? [])];
	const existingContentTypeHeader = getExistingContentTypeHeader(combinedHeaders);
	const existingSdkVersionHeader = getExistingSdkVersionHeader(combinedHeaders);

	const contentTypeHeader = existingContentTypeHeader ? undefined : createDefaultContentTypeHeader(body);
	const sdkVersionHeader = existingSdkVersionHeader
		? undefined
		: getSdkIdHeader({
				host: sdkInfo.host,
				name: sdkInfo.name,
				version: sdkInfo.version,
			});

	const contentLengthHeader = body instanceof Blob ? createDefaultContentLengthHeader(body) : undefined;

	return [...combinedHeaders, contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isNotUndefined);
}

function createDefaultContentTypeHeader(body: Blob | JsonValue): Header {
	return {
		name: "Content-Type" satisfies CommonHeaderNames,
		value: body instanceof Blob ? body.type : "application/json",
	};
}

function createDefaultContentLengthHeader(body: Blob): Header {
	return {
		name: "Content-Length" satisfies CommonHeaderNames,
		value: body.size.toString(),
	};
}

function getExistingContentTypeHeader(headers: readonly Header[]): Header | undefined {
	return headers.find((header) => header.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase());
}

function getExistingSdkVersionHeader(headers: readonly Header[]): Header | undefined {
	return headers.find((header) => header.name.toLowerCase() === ("X-KC-SDKID" satisfies CommonHeaderNames).toLowerCase());
}
