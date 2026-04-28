import { type Mock, vi } from "vitest";
import type { ExtractNextPageDataFn, HttpService, HttpStatusCode } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { KnownHeaderName, RetryStrategyOptions, SdkInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { Header } from "../public_api.js";
import { isDefined } from "../utils/core.utils.js";
import { createContinuationHeader, findHeaderByName, toFetchHeaders } from "../utils/header.utils.js";

const upperBoundLimitForInfinitePaging = 50;

export function mockGlobalFetchJsonResponse({
	jsonResponse,
	statusCode,
	continuationToken,
}: {
	readonly jsonResponse: JsonValue;
	readonly statusCode: HttpStatusCode;
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
	readonly statusCode: HttpStatusCode;
}): void {
	global.fetch = getFetchBlobMock({
		blob: blobResponse,
		status: statusCode,
	});
}

export function getFakeBlob(): Blob {
	return new Blob(["x"], { type: "text/plain" });
}

export function getTestSdkInfo(): SdkInfo {
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
	retryStrategy,
}: {
	readonly jsonResponse: JsonValue | (() => Promise<JsonValue>);
	readonly statusCode: HttpStatusCode;
	readonly continuationToken?: string;
	readonly retryStrategy?: RetryStrategyOptions;
}): HttpService {
	return getDefaultHttpService({
		retryStrategy: retryStrategy ?? {},
		adapter: {
			executeRequest: async ({ url }) => {
				return {
					responseHeaders: [...(continuationToken ? [createContinuationHeader(continuationToken)] : [])],
					status: statusCode,
					statusText: "",
					url,
					payload: typeof jsonResponse === "function" ? await jsonResponse() : jsonResponse,
				};
			},
			downloadFile: async ({ url }) => {
				return {
					responseHeaders: [],
					status: 200,
					statusText: "",
					url,
					payload: await Promise.resolve(getFakeBlob()),
				};
			},
		},
	});
}

export function preventInfinitePaging({
	responseIndex,
	maxPagesCount,
	continuationToken,
	nextPageUrl,
}: {
	readonly responseIndex: number;
	readonly maxPagesCount: number;
	readonly continuationToken?: string;
	readonly nextPageUrl?: string | undefined;
}): ReturnType<ExtractNextPageDataFn<null, null, unknown>> {
	if (responseIndex >= maxPagesCount + upperBoundLimitForInfinitePaging) {
		throw new Error("Infinite paging detected");
	}

	return {
		continuationToken,
		nextPageUrl,
	};
}

export function getNextPageUrl(index: number): string {
	return `https://page-url.com/${index}`;
}

function getFetchBlobMock({
	blob,
	status,
	responseHeaders,
}: {
	readonly blob: Blob;
	readonly status: HttpStatusCode;
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
	readonly status: HttpStatusCode;
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
	readonly status: HttpStatusCode;
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
	const headersWithDefaults: readonly Header[] = [...headers, defaultContentTypeHeader].filter(isDefined);
	return toFetchHeaders(headersWithDefaults);
}

function getDefaultContentTypeHeaderIfMissing(headers: readonly Header[]): Header | undefined {
	const hasContentTypeHeader = findHeaderByName(headers, "Content-Type");

	if (hasContentTypeHeader) {
		return undefined;
	}

	return {
		name: "Content-Type" satisfies KnownHeaderName,
		value: "application/json",
	};
}
