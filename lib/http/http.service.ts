import { match, P } from "ts-pattern";
import type { CommonHeaderNames, Header, KontentErrorResponseData, RetryStrategyOptions } from "../models/core.models.js";
import type { SdkError, SdkErrorDetails } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { sdkInfo } from "../sdk-info.js";
import { isBlob, isNotUndefined } from "../utils/core.utils.js";
import { createSdkError, getErrorMessage, isKontentErrorResponseData } from "../utils/error.utils.js";
import { getSdkIdHeader } from "../utils/header.utils.js";
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from "../utils/retry.utils.js";
import { type Result, tryCatch, tryCatchAsync } from "../utils/try.utils.js";
import { getDefaultHttpAdapter } from "./http.adapter.js";
import type {
	AdapterResponse,
	DefaultHttpServiceConfig,
	DownloadFileRequestOptions,
	ExecuteRequestOptions,
	HttpResponse,
	HttpService,
	UploadFileRequestOptions,
} from "./http.models.js";

export function getDefaultHttpService(config?: DefaultHttpServiceConfig): HttpService {
	const withUnknownErrorHandlingAsync = async <TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob>({
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

	const resolveRequestAsync = async <TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob>({
		options,
		resolveDataAsync,
	}: {
		readonly options: ExecuteRequestOptions<TBodyData>;
		readonly resolveDataAsync: (response: AdapterResponse) => Promise<TResponseData>;
	}): Promise<HttpResponse<TResponseData, TBodyData>> => {
		return await withUnknownErrorHandlingAsync({
			url: options.url,
			funcAsync: async () => {
				const adapter = config?.adapter ?? getDefaultHttpAdapter();

				const getCombinedRequestHeaders = (): readonly Header[] => {
					return getRequestHeaders([...(config?.requestHeaders ?? []), ...(options.requestHeaders ?? [])], options.body);
				};

				const requestHeaders = getCombinedRequestHeaders();
				const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(config?.retryStrategy);

				const getRequestBody = (): Result<string | Blob | null, SdkError> => {
					return match(options.body)
						.returnType<Result<string | Blob | null, SdkError>>()
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
										url: options.url,
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
				};

				const getUrl = (): Result<URL, SdkError> => {
					const { success, data: parsedUrl, error } = tryCatch(() => new URL(options.url));

					if (!success) {
						return {
							success: false,
							error: createSdkError({
								message: `Failed to parse url '${options.url}'.`,
								url: options.url,
								reason: "invalidUrl",
								originalError: error,
							}),
						};
					}

					return {
						success: true,
						data: parsedUrl,
					};
				};

				const withRetryAsync = async (
					funcAsync: () => Promise<HttpResponse<TResponseData, TBodyData>>,
				): Promise<HttpResponse<TResponseData, TBodyData>> => {
					return await runWithRetryAsync({
						url: options.url,
						retryStrategyOptions,
						retryAttempt: 0,
						requestHeaders,
						method: options.method,
						funcAsync: async () => {
							return await funcAsync();
						},
					});
				};

				const { success: urlParsedSuccess, data: parsedUrl, error: urlError } = getUrl();

				if (!urlParsedSuccess) {
					return {
						success: false,
						error: urlError,
					};
				}

				const { success: requestBodyParsedSuccess, data: requestBody, error: requestBodyError } = getRequestBody();

				if (!requestBodyParsedSuccess) {
					return {
						success: false,
						error: requestBodyError,
					};
				}

				const getResponseAsync = async (): Promise<AdapterResponse> => {
					return await adapter.requestAsync({
						url: parsedUrl.toString(),
						method: options.method,
						requestHeaders,
						body: requestBody,
					});
				};

				const getErrorDetailsForInvalidResponseAsync = async (response: AdapterResponse): Promise<SdkErrorDetails> => {
					const sharedErrorData: Pick<SdkErrorDetails, "message" | "url"> = {
						message: getErrorMessage({
							url: options.url,
							adapterResponse: response,
							method: options.method,
						}),
						url: options.url,
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
				};

				const getErrorForInvalidResponseAsync = async (response: AdapterResponse): Promise<SdkError> => {
					return createSdkError(await getErrorDetailsForInvalidResponseAsync(response));
				};

				const resolveResponseAsync = async (response: AdapterResponse): Promise<HttpResponse<TResponseData, TBodyData>> => {
					if (!response.isValidResponse) {
						return {
							success: false,
							error: await getErrorForInvalidResponseAsync(response),
						};
					}

					return {
						success: true,
						response: {
							data: await resolveDataAsync(response),
							body: options.body,
							method: options.method,
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
				};

				return await withRetryAsync(async () => await resolveResponseAsync(await getResponseAsync()));
			},
		});
	};

	return {
		requestAsync: async <TResponseData extends JsonValue, TBodyData extends JsonValue>(options: ExecuteRequestOptions<TBodyData>) => {
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

async function getKontentErrorDataAsync(response: AdapterResponse): Promise<KontentErrorResponseData | undefined> {
	if (isApplicationJsonResponseType(response)) {
		const json = await response.toJsonAsync();

		if (isKontentErrorResponseData(json)) {
			return json;
		}
	}

	return undefined;
}

function isApplicationJsonResponseType(response: AdapterResponse): boolean {
	return (
		response.responseHeaders
			.find((header) => header.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase())
			?.value.toLowerCase()
			.includes("application/json") ?? false
	);
}

function getRequestHeaders(headers: readonly Header[] | undefined, body: Blob | JsonValue): readonly Header[] {
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
