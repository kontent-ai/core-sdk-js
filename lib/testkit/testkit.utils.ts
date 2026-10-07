import { vi } from "vitest";
import type { HttpService, HttpStatusCode } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { RetryStrategyOptions, SdkInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { GetNextPageData } from "../sdk/sdk-models.js";
import { createContinuationHeader } from "../utils/header.utils.js";

const upperBoundLimitForInfinitePaging = 50;

/**
 * Stubs the global `fetch` so that every call resolves with a response created by `getResponse`.
 *
 * A factory is required because the body of a `Response` can only be read once, so each `fetch` call needs a fresh instance.
 */
export function stubFetchWithResponse(getResponse: () => Response): void {
	vi.stubGlobal("fetch" satisfies keyof typeof globalThis, async () => await Promise.resolve(getResponse()));
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
}): ReturnType<GetNextPageData<null, null, unknown>> {
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
