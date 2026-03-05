import { type Mock, vi } from "vitest";
import type { HttpService, HttpServiceStatus } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, RetryStrategyOptions, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { Header } from "../public_api.js";
import { isNotUndefined } from "../utils/core.utils.js";
import { createContinuationHeader, findHeaderByName, toFetchHeaders } from "../utils/header.utils.js";

export function mockGlobalFetchJsonResponse({
	jsonResponse,
	statusCode,
	continuationToken,
}: {
	readonly jsonResponse: JsonValue;
	readonly statusCode: HttpServiceStatus;
	readonly continuationToken?: string;
}): void {
	global.fetch = getFetchJsonMock({
		json: jsonResponse,
		status: statusCode,
		responseHeaders: continuationToken ? [createContinuationHeader(continuationToken)] : [],
	});
}

export function mockGlobalFetchBlobResponse({
	blobResponse,
	statusCode,
}: {
	readonly blobResponse: Blob;
	readonly statusCode: HttpServiceStatus;
}): void {
	global.fetch = getFetchBlobMock({
		blob: blobResponse,
		status: statusCode,
	});
}

export function getFakeBlob(): Blob {
	return new Blob(["x"], { type: "text/plain" });
}

export function getTestSdkInfo(): SDKInfo {
	return {
		name: "test",
		version: "0.0.0",
		host: "sdk",
	};
}

export function getTestHttpServiceWithJsonResponse({
	jsonResponse,
	statusCode,
	continuationToken,
	url,
	retryStrategy,
	isValidResponse,
}: {
	readonly jsonResponse: JsonValue | (() => Promise<JsonValue>);
	readonly statusCode: HttpServiceStatus;
	readonly continuationToken?: string;
	readonly url?: string;
	readonly retryStrategy?: RetryStrategyOptions;
	readonly isValidResponse?: boolean;
}): HttpService {
	const getUrl = () => url ?? "https://default-url.com";
	return getDefaultHttpService({
		retryStrategy: retryStrategy ?? {},
		adapter: {
			executeRequestAsync: async () => {
				return {
					isValidResponse: isValidResponse ?? true,
					responseHeaders: [...(continuationToken ? [createContinuationHeader(continuationToken)] : [])],
					status: statusCode,
					statusText: "",
					url: getUrl(),
					payload: typeof jsonResponse === "function" ? await jsonResponse() : jsonResponse,
				};
			},
			downloadFileAsync: async () => {
				return {
					isValidResponse: true,
					responseHeaders: [],
					status: 200,
					statusText: "",
					url: getUrl(),
					payload: await Promise.resolve(getFakeBlob()),
				};
			},
		},
	});
}

function getFetchBlobMock({
	blob,
	status,
	responseHeaders,
}: {
	readonly blob: Blob;
	readonly status: HttpServiceStatus;
	readonly responseHeaders?: readonly Header[];
}): Mock<() => Promise<Response>> {
	return getFetchMock<Blob>({
		blob,
		status,
		responseHeaders: responseHeaders ?? [],
		json: undefined,
	});
}

function getFetchJsonMock<TResponsePayload extends JsonValue>({
	json,
	status,
	responseHeaders,
}: {
	readonly json: TResponsePayload;
	readonly status: HttpServiceStatus;
	readonly responseHeaders?: readonly Header[];
}): Mock<() => Promise<Response>> {
	return getFetchMock<JsonValue>({
		status,
		responseHeaders: responseHeaders ?? [],
		blob: undefined,
		json,
	});
}

function getFetchMock<TResponsePayload extends JsonValue | Blob>({
	json,
	blob,
	status,
	responseHeaders,
}: {
	readonly json: TResponsePayload extends JsonValue ? JsonValue : undefined;
	readonly blob: TResponsePayload extends Blob ? Blob : undefined;
	readonly status: HttpServiceStatus;
	readonly responseHeaders: readonly Header[];
}): Mock<() => Promise<Response>> {
	return vi.fn(async () => {
		const baseResponse: Partial<Response> = {
			ok: status >= 200 && status < 300,
			headers: buildHeadersWithDefaultContentType(responseHeaders),
			status,
			json: async () => await Promise.resolve(json),
			...(blob ? { blob: async () => await Promise.resolve(blob) } : {}),
		};

		return await Promise.resolve<Response>({
			// only implement the methods we need, ignore the rest
			...({} as Response),
			...baseResponse,
		});
	});
}

function buildHeadersWithDefaultContentType(headers: readonly Header[]): Headers {
	const defaultContentTypeHeader = getDefaultContentTypeHeaderIfMissing(headers);
	const headersWithDefaults: readonly Header[] = [...headers, defaultContentTypeHeader].filter(isNotUndefined);
	return toFetchHeaders(headersWithDefaults);
}

function getDefaultContentTypeHeaderIfMissing(headers: readonly Header[]): Header | undefined {
	const hasContentTypeHeader = findHeaderByName(headers, "Content-Type");

	if (hasContentTypeHeader) {
		return undefined;
	}

	return {
		name: "Content-Type" satisfies CommonHeaderNames,
		value: "application/json",
	};
}
