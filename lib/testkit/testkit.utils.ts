import { type Mock, vi } from "vitest";
import type { AdapterResponse, HttpService, HttpServiceStatus } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, ContinuationHeaderName, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { Header } from "../public_api.js";
import { isNotUndefined } from "../utils/core.utils.js";
import { toFetchHeaders } from "../utils/header.utils.js";

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
		responseHeaders: continuationToken ? [{ name: "X-Continuation" satisfies ContinuationHeaderName, value: continuationToken }] : [],
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
}: {
	readonly jsonResponse: JsonValue;
	readonly statusCode: HttpServiceStatus;
	readonly continuationToken?: string;
}): HttpService {
	return getDefaultHttpService({
		adapter: {
			requestAsync: async () => {
				const adapterResponse: AdapterResponse = {
					isValidResponse: true,
					responseHeaders: [
						...(continuationToken
							? [{ name: "X-Continuation" satisfies ContinuationHeaderName, value: continuationToken }]
							: []),
					],
					status: statusCode,
					statusText: "",
					toJsonAsync: async () => {
						return await Promise.resolve(jsonResponse);
					},
					toBlobAsync: () => {
						throw new Error("n/a");
					},
				};

				return await Promise.resolve<AdapterResponse>(adapterResponse);
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

function getFetchJsonMock<TResponseData extends JsonValue>({
	json,
	status,
	responseHeaders,
}: {
	readonly json: TResponseData;
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

function getFetchMock<TResponseData extends JsonValue | Blob>({
	json,
	blob,
	status,
	responseHeaders,
}: {
	readonly json: TResponseData extends JsonValue ? JsonValue : undefined;
	readonly blob: TResponseData extends Blob ? Blob : undefined;
	readonly status: HttpServiceStatus;
	readonly responseHeaders: readonly Header[];
}): Mock<() => Promise<Response>> {
	return vi.fn(async () => {
		const contentTypeHeader: Header | undefined = responseHeaders.find(
			(m) => m.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase(),
		)
			? undefined
			: {
					name: "Content-Type" satisfies CommonHeaderNames,
					value: "application/json",
				};

		return await Promise.resolve<Response>({
			// only implement the methods we need, ignore the rest
			...({} as Response),
			ok: status === 200,
			headers: toFetchHeaders([...responseHeaders, contentTypeHeader].filter(isNotUndefined)),
			status,
			json: async () => await Promise.resolve(json),
			...(blob ? { blob: async () => await Promise.resolve(blob) } : {}),
		});
	});
}
