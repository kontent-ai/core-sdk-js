import { match, P } from "ts-pattern";
import type { CommonHeaderNames, Header, HttpMethod, KontentErrorResponseData, RetryStrategyOptions } from "../models/core.models.js";
import type { SdkError, SdkErrorDetails } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { sdkInfo } from "../sdk-info.js";
import { isBlob, isNotUndefined } from "../utils/core.utils.js";
import { createSdkError, getErrorMessage, isKontentErrorResponseData } from "../utils/error.utils.js";
import { getSdkIdHeader, isApplicationJsonResponseType } from "../utils/header.utils.js";
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from "../utils/retry.utils.js";
import { type Result, tryCatch, tryCatchAsync } from "../utils/try.utils.js";
import { getDefaultHttpAdapter } from "./http.adapter.js";
import type {
	AdapterRequestBody,
	AdapterResponse,
	DefaultHttpServiceConfig,
	DownloadFileRequestOptions,
	ExecuteRequestOptions,
	HttpResponse,
	HttpService,
	RequestBody,
	ResponseType,
	UploadFileRequestOptions,
} from "./http.models.js";

export function getDefaultHttpService(config?: DefaultHttpServiceConfig): HttpService {
	const withUnknownErrorHandlingAsync = async <TResponseData extends ResponseType, TBodyData extends RequestBody>({
		url,
		funcAsync,
	}: {
		readonly url: string;
		readonly funcAsync: () => Promise<HttpResponse<TResponseData, TBodyData>>;
	}): Promise<HttpResponse<TResponseData, TBodyData>> => {
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
			}),
		};
	};

	const resolveRequestAsync = async <TResponseData extends ResponseType, TBodyData extends RequestBody>({
		options,
		resolveDataAsync,
	}: {
		readonly options: ExecuteRequestOptions<TBodyData>;
		readonly resolveDataAsync: (response: AdapterResponse) => Promise<TResponseData>;
	}): Promise<HttpResponse<TResponseData, TBodyData>> => {
		return await withUnknownErrorHandlingAsync({
			url: options.url,
			funcAsync: async () => {
				const { success: urlParsedSuccess, data: parsedUrl, error: urlError } = parseUrl(options.url);

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
				} = parseRequestBody({ requestBody: options.body, url: options.url });

				if (!requestBodyParsedSuccess) {
					return {
						success: false,
						error: requestBodyError,
					};
				}

				const requestHeaders = getRequestHeaders({
					headers: [...(config?.requestHeaders ?? []), ...(options.requestHeaders ?? [])],
					body: options.body,
				});

				return await withRetryAsync({
					funcAsync: async () => {
						const adapter = config?.adapter ?? getDefaultHttpAdapter();

						return await resolveResponseAsync({
							method: options.method,
							requestBody: options.body,
							requestHeaders,
							response: await adapter.requestAsync({
								url: parsedUrl.toString(),
								method: options.method,
								requestHeaders,
								body: parsedRequestBody,
							}),
							resolveDataAsync,
						});
					},
					url: options.url,
					retryStrategyOptions: toRequiredRetryStrategyOptions(config?.retryStrategy),
					requestHeaders,
					method: options.method,
				});
			},
		});
	};

	return {
		requestAsync: async <TResponseData extends JsonValue, TBodyData extends RequestBody>(options: ExecuteRequestOptions<TBodyData>) => {
			return await resolveRequestAsync<TResponseData, TBodyData>({
				options,
				resolveDataAsync: async (response) => {
					return (await response.toJsonAsync()) as TResponseData;
				},
			});
		},

		downloadFileAsync: async (options: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
			return await resolveRequestAsync<Blob, null>({
				options: {
					...options,
					method: "GET",
					body: null,
				},
				resolveDataAsync: async (response) => {
					return await response.toBlobAsync();
				},
			});
		},

		uploadFileAsync: async <TResponseData extends JsonValue>(
			options: UploadFileRequestOptions,
		): Promise<HttpResponse<TResponseData, Blob>> => {
			return await resolveRequestAsync<TResponseData, Blob>({
				options,
				resolveDataAsync: async (response) => {
					return (await response.toJsonAsync()) as TResponseData;
				},
			});
		},
	};
}

async function resolveResponseAsync<TResponseData extends ResponseType, TBodyData extends RequestBody>({
	response,
	resolveDataAsync,
	method,
	requestHeaders,
	requestBody,
}: {
	readonly response: AdapterResponse;
	readonly resolveDataAsync: (response: AdapterResponse) => Promise<TResponseData>;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly requestBody: TBodyData;
}): Promise<HttpResponse<TResponseData, TBodyData>> {
	if (!response.isValidResponse) {
		return {
			success: false,
			error: await getErrorForInvalidResponseAsync(response, method),
		};
	}

	return {
		success: true,
		response: {
			data: await resolveDataAsync(response),
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

async function withRetryAsync<TResponseData extends ResponseType, TBodyData extends RequestBody>({
	funcAsync,
	url,
	retryStrategyOptions,
	requestHeaders,
	method,
}: {
	readonly funcAsync: () => Promise<HttpResponse<TResponseData, TBodyData>>;
	readonly url: string;
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly requestHeaders: readonly Header[];
	readonly method: HttpMethod;
}): Promise<HttpResponse<TResponseData, TBodyData>> {
	return await runWithRetryAsync({
		url: url,
		retryStrategyOptions,
		retryAttempt: 0,
		requestHeaders,
		method: method,
		funcAsync: async () => {
			return await funcAsync();
		},
	});
}

async function getErrorForInvalidResponseAsync(response: AdapterResponse, method: HttpMethod): Promise<SdkError> {
	return createSdkError(await getErrorDetailsForInvalidResponseAsync(response, method));
}

async function getErrorDetailsForInvalidResponseAsync(response: AdapterResponse, method: HttpMethod): Promise<SdkErrorDetails> {
	const sharedErrorData: Pick<SdkErrorDetails, "message" | "url"> = {
		message: getErrorMessage({
			url: response.url,
			adapterResponse: response,
			method: method,
		}),
		url: response.url,
	};

	return await match(response)
		.returnType<Promise<SdkErrorDetails>>()
		.with({ status: P.union(401, 404) }, async (m) => ({
			...sharedErrorData,
			reason: m.status === 401 ? "unauthorized" : "notFound",
			isValidResponse: m.isValidResponse,
			responseHeaders: m.responseHeaders,
			status: m.status,
			statusText: m.statusText,
			kontentErrorResponse: await getKontentErrorDataAsync(m),
		}))
		.otherwise(async () => ({
			...sharedErrorData,
			reason: "invalidResponse",
			isValidResponse: response.isValidResponse,
			responseHeaders: response.responseHeaders,
			status: response.status,
			statusText: response.statusText,
			kontentErrorResponse: await getKontentErrorDataAsync(response),
		}));
}

function parseRequestBody({
	requestBody,
	url,
}: {
	readonly requestBody: RequestBody;
	readonly url: string;
}): Result<AdapterRequestBody, SdkError> {
	return match(requestBody)
		.returnType<Result<AdapterRequestBody, SdkError>>()
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
						message: "Failed to stringify body of the response.",
						url: url,
						reason: "invalidBody",
						originalError: parseError,
					}),
				};
			}

			return {
				success: true,
				data: parsedBody,
			};
		});
}

async function getKontentErrorDataAsync(response: AdapterResponse): Promise<KontentErrorResponseData | undefined> {
	if (isApplicationJsonResponseType(response.responseHeaders)) {
		const json = await response.toJsonAsync();

		if (isKontentErrorResponseData(json)) {
			return json;
		}
	}

	return undefined;
}

function parseUrl(url: string): Result<URL, SdkError> {
	const { success, data: parsedUrl, error } = tryCatch(() => new URL(url));

	if (!success) {
		return {
			success: false,
			error: createSdkError({
				message: `Failed to parse url '${url}'.`,
				url: url,
				reason: "invalidUrl",
				originalError: error,
			}),
		};
	}

	return {
		success: true,
		data: parsedUrl,
	};
}

function getRequestHeaders({
	headers,
	body,
}: {
	readonly headers: readonly Header[] | undefined;
	readonly body: Blob | JsonValue;
}): readonly Header[] {
	const existingContentTypeHeader = getExistingContentTypeHeader(headers ?? []);
	const existingSdkVersionHeader = getExistingSdkVersionHeader(headers ?? []);

	const contentTypeHeader = existingContentTypeHeader ? undefined : createDefaultContentTypeHeader(body);
	const sdkVersionHeader = existingSdkVersionHeader
		? undefined
		: getSdkIdHeader({
				host: sdkInfo.host,
				name: sdkInfo.name,
				version: sdkInfo.version,
			});

	const contentLengthHeader = body instanceof Blob ? createDefaultContentLengthHeader(body) : undefined;

	return [...(headers ?? []), contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isNotUndefined);
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
