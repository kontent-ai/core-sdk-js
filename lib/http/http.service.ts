import type { CommonHeaderNames, Header, KontentErrorResponseData, RetryStrategyOptions } from "../models/core.models.js";
import type { CoreSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { sdkInfo } from "../sdk-info.js";
import { isNotUndefined } from "../utils/core.utils.js";
import { getErrorMessage } from "../utils/error.utils.js";
import { getSdkIdHeader } from "../utils/header.utils.js";
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from "../utils/retry.utils.js";
import { type Result, tryCatch } from "../utils/try.utils.js";
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
	const resolveRequestAsync = async <TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob>({
		options,
		resolveDataAsync,
	}: {
		readonly options: ExecuteRequestOptions<TBodyData>;
		readonly resolveDataAsync: (response: AdapterResponse) => Promise<TResponseData>;
	}): Promise<HttpResponse<TResponseData, TBodyData>> => {
		const adapter = config?.adapter ?? getDefaultHttpAdapter();

		const getCombinedRequestHeaders = (): readonly Header[] => {
			return getRequestHeaders([...(config?.requestHeaders ?? []), ...(options.requestHeaders ?? [])], options.body);
		};

		const getRequestBody = (): Result<string | Blob | null, CoreSdkError> => {
			if (options.body === null) {
				return {
					success: true,
					data: null,
				};
			}

			if (options.body instanceof Blob) {
				return {
					success: true,
					data: options.body,
				};
			}

			const { success, data: parsedBody, error } = tryCatch(() => JSON.stringify(options.body));

			if (!success) {
				return {
					success: false,
					error: {
						message: "Failed to stringify body of request.",
						url: options.url,
						reason: "invalidBody",
						error: error,
					},
				};
			}

			return {
				success: true,
				data: parsedBody,
			};
		};

		const getUrl = (): Result<URL, CoreSdkError> => {
			const { success, data: parsedUrl, error } = tryCatch(() => new URL(options.url));

			if (!success) {
				return {
					success: false,
					error: {
						message: `Failed to parse url '${options.url}'.`,
						url: options.url,
						reason: "invalidUrl",
						error,
					},
				};
			}

			return {
				success: true,
				data: parsedUrl,
			};
		};

		const requestHeaders = getCombinedRequestHeaders();
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(config?.retryStrategy);

		const withRetryAsync = async (funcAsync: () => Promise<HttpResponse<TResponseData, TBodyData>>): Promise<HttpResponse<TResponseData, TBodyData>> => {
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

		const getErrorForInvalidResponseAsync = async (response: AdapterResponse): Promise<CoreSdkError> => {
			const sharedErrorData: Pick<CoreSdkError, "message" | "url"> = {
				message: getErrorMessage({
					url: options.url,
					adapterResponse: response,
					method: options.method,
				}),
				url: options.url,
			};

			if (response.status === 404) {
				const error: CoreSdkError<"notFound"> = {
					...sharedErrorData,
					reason: "notFound",
					isValidResponse: response.isValidResponse,
					responseHeaders: response.responseHeaders,
					status: 404,
					statusText: response.statusText,
					kontentErrorResponse: await getKontentErrorDataAsync(response),
				};

				return error;
			}

			const error: CoreSdkError<"invalidResponse"> = {
				...sharedErrorData,
				reason: "invalidResponse",
				isValidResponse: response.isValidResponse,
				responseHeaders: response.responseHeaders,
				status: response.status,
				statusText: response.statusText,
				kontentErrorResponse: await getKontentErrorDataAsync(response),
			};

			return error;
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

		uploadFileAsync: async <TResponseData extends JsonValue>(options: UploadFileRequestOptions): Promise<HttpResponse<TResponseData, Blob>> => {
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
	if (
		response.responseHeaders
			.find((header) => header.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase())
			?.value.toLowerCase()
			.includes("application/json")
	) {
		const json = (await response.toJsonAsync()) as Partial<KontentErrorResponseData>;

		// We check the existence of 'message' property which should always be set when the error is a Kontent API error
		if (!json.message) {
			return undefined;
		}

		return {
			...json,
			message: json.message,
		};
	}
	return undefined;
}

function getRequestHeaders(headers: readonly Header[] | undefined, body: Blob | JsonValue): readonly Header[] {
	const existingContentTypeHeader = headers?.find((header) => header.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase());
	const existingSdkVersionHeader = headers?.find((header) => header.name.toLowerCase() === ("X-KC-SDKID" satisfies CommonHeaderNames).toLowerCase());

	const contentTypeHeader: Header | undefined = existingContentTypeHeader
		? undefined
		: {
				name: "Content-Type" satisfies CommonHeaderNames,
				value: body instanceof Blob ? body.type : "application/json",
			};

	const sdkVersionHeader: Header | undefined = existingSdkVersionHeader
		? undefined
		: getSdkIdHeader({
				host: sdkInfo.host,
				name: sdkInfo.name,
				version: sdkInfo.version,
			});

	const contentLengthHeader: Header | undefined =
		body instanceof Blob
			? {
					name: "Content-Length" satisfies CommonHeaderNames,
					value: body.size.toString(),
				}
			: undefined;

	return [...(headers ?? []), contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isNotUndefined);
}
