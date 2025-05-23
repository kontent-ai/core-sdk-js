import {
	type CommonHeaderNames,
	type Header,
	type HttpMethod,
	HttpServiceInvalidResponseError,
	HttpServiceParsingError,
	type KontentErrorResponseData,
	type RetryStrategyOptions,
} from '../models/core.models.js';
import type { JsonValue } from '../models/json.models.js';
import { sdkInfo } from '../sdk-info.js';
import { isNotUndefined } from '../utils/core.utils.js';
import { getSdkIdHeader, toFetchHeaders, toSdkHeaders } from '../utils/header.utils.js';
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from '../utils/retry.utils.js';
import type {
	DefaultHttpServiceConfig,
	DownloadFileRequestOptions,
	ExecuteRequestOptions,
	HttpQueryOptions,
	HttpResponse,
	HttpService,
	SendRequestOptions,
	UploadFileRequestOptions,
} from './http.models.js';

export function getDefaultHttpService(config?: DefaultHttpServiceConfig): HttpService {
	const fetchAsync = async <TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob>({
		url,
		method,
		body,
		options,
		resolveDataAsync,
	}: {
		readonly url: string;
		readonly method: HttpMethod;
		readonly body: TBodyData;
		readonly options?: HttpQueryOptions;
		readonly resolveDataAsync: (response: Response) => Promise<TResponseData>;
	}): Promise<HttpResponse<TResponseData, TBodyData>> => {
		const getCombinedRequestHeaders = (): readonly Header[] => {
			return getRequestHeaders([...(config?.requestHeaders ?? []), ...(options?.requestHeaders ?? [])], body);
		};

		const getRequestBody = (): string | Blob | null => {
			if (body === null) {
				return null;
			}

			if (body instanceof Blob) {
				return body;
			}

			try {
				return JSON.stringify(body);
			} catch (error) {
				throw new HttpServiceParsingError('Failed to stringify body of request.');
			}
		};

		const getUrl = (): URL => {
			try {
				return new URL(url);
			} catch (error) {
				throw new HttpServiceParsingError(`Failed to parse url '${url}'.`);
			}
		};

		const requestHeaders = getCombinedRequestHeaders();
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(config?.retryStrategy);

		const withRetryAsync = async (funcAsync: () => Promise<HttpResponse<TResponseData, TBodyData>>): Promise<HttpResponse<TResponseData, TBodyData>> => {
			return await runWithRetryAsync({
				url,
				retryStrategyOptions,
				retryAttempt: 0,
				requestHeaders,
				method,
				funcAsync,
			});
		};

		const getResponseAsync = async (): Promise<Response> => {
			return await fetch(getUrl().toString(), {
				method,
				headers: toFetchHeaders(requestHeaders),
				body: getRequestBody(),
			});
		};

		const resolveResponseAsync = async (response: Response): Promise<HttpResponse<TResponseData, TBodyData>> => {
			const responseHeaders = toSdkHeaders(response.headers);

			if (!response.ok) {
				throw new HttpServiceInvalidResponseError({
					kontentErrorData: await getKontentErrorDataAsync(response),
					statusCode: response.status,
					statusText: response.statusText,
					responseHeaders: responseHeaders,
				});
			}

			return {
				data: await resolveDataAsync(response),
				body: body,
				method: method,
				responseHeaders: responseHeaders,
				status: response.status,
				requestHeaders: requestHeaders,
			};
		};

		return await withRetryAsync(async () => await resolveResponseAsync(await getResponseAsync()));
	};

	return {
		sendAsync: async <TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob>(
			options: SendRequestOptions<TResponseData, TBodyData>,
		) => {
			throw new Error('Not implemented');
			// return await fetchAsync<TResponseData, TBodyData>({
			// 	...options,
			// 	resolveDataAsync: async (response) => {
			// 		return await response.json();
			// 	},
			// });
		},
		executeAsync: async <TResponseData extends JsonValue, TBodyData extends JsonValue>(options: ExecuteRequestOptions<TBodyData>) => {
			return await fetchAsync<TResponseData, TBodyData>({
				...options,
				resolveDataAsync: async (response) => {
					const contentTypeResponseHeader = toSdkHeaders(response.headers)
						.find((m) => m.name.toLowerCase() === ('Content-Type' satisfies CommonHeaderNames).toLowerCase())
						?.value?.toLowerCase();

					if (contentTypeResponseHeader?.includes('application/json')) {
						// Includes instead of equap due to the fact that the header value can be 'application/json; charset=utf-8' or similar
						return (await response.json()) as TResponseData;
					}

					return null as TResponseData;
				},
			});
		},

		downloadFileAsync: async ({ url, options }: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
			return await fetchAsync<Blob, null>({
				url: url,
				method: 'GET',
				body: null,
				options: options,
				resolveDataAsync: async (response) => {
					console.log('response', response);
					return await response.blob();
				},
			});
		},

		uploadFileAsync: async <TResponseData extends JsonValue>({
			url,
			method,
			file,
			options,
		}: UploadFileRequestOptions): Promise<HttpResponse<TResponseData, Blob>> => {
			return await fetchAsync<TResponseData, Blob>({
				url: url,
				method: method,
				body: file,
				options: options,
				resolveDataAsync: async (response) => {
					console.log('response', response);
					return (await response.json()) as TResponseData;
				},
			});
		},
	};
}

async function getKontentErrorDataAsync(response: Response): Promise<KontentErrorResponseData | undefined> {
	const json = (await response.json()) as Partial<KontentErrorResponseData>;

	// We check the existence of 'message' property which should always be set when the error is a Kontent API error
	if (!json || !json.message) {
		return undefined;
	}

	return {
		...json,
		message: json.message,
	};
}

function getRequestHeaders(headers: readonly Header[] | undefined, body: Blob | JsonValue): readonly Header[] {
	const existingContentTypeHeader = headers?.find((header) => header.name.toLowerCase() === ('Content-Type' satisfies CommonHeaderNames).toLowerCase());
	const existingSdkVersionHeader = headers?.find((header) => header.name.toLowerCase() === ('X-KC-SDKID' satisfies CommonHeaderNames).toLowerCase());

	const contentTypeHeader: Header | undefined = existingContentTypeHeader
		? undefined
		: {
				name: 'Content-Type' satisfies CommonHeaderNames,
				value: body instanceof Blob ? body.type : 'application/json',
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
					name: 'Content-Length' satisfies CommonHeaderNames,
					value: body.size.toString(),
				}
			: undefined;

	return [...(headers ?? []), contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isNotUndefined);
}
