import { describe, expect, it } from "vitest";
import type { ErrorReason } from "../../../lib/models/error.models.js";
import { resolveDefaultRetryStrategyOptions } from "../../../lib/utils/retry.utils.js";
import { getEndpointUrl, parseUrl } from "../../../lib/utils/url.utils.js";

describe("getEndpointUrl", () => {
	it("Should combine baseUrl, environmentId and path with single slashes", () => {
		const url = getEndpointUrl({
			baseUrl: { protocol: "https", host: "deliver.kontent.ai" },
			environmentId: "env-id",
			path: "items",
		});

		expect(url).toBe("https://deliver.kontent.ai/env-id/items");
	});

	it("Should normalize duplicate slashes between segments", () => {
		const url = getEndpointUrl({
			baseUrl: { protocol: "https", host: "deliver.kontent.ai" },
			environmentId: "/env-id/",
			path: "/items/",
		});

		expect(url).toBe("https://deliver.kontent.ai/env-id/items/");
	});

	it("Should remove trailing slashes from host", () => {
		const url = getEndpointUrl({
			baseUrl: { protocol: "https", host: "deliver.kontent.ai///" },
			environmentId: "env-id",
			path: "items/123",
		});

		expect(url).toBe("https://deliver.kontent.ai/env-id/items/123");
	});

	it("Should not normalize slashes in query string or fragment", () => {
		const url = getEndpointUrl({
			baseUrl: { protocol: "https", host: "deliver.kontent.ai" },
			environmentId: "env-id",
			path: "//items?url=https://x.com//a#frag//b",
		});

		expect(url).toBe("https://deliver.kontent.ai/env-id/items?url=https://x.com//a#frag//b");
	});
});

describe("parseUrl", () => {
	const invalidUrl = "invalid-url";

	it("Should return a URL instance as is", () => {
		const url = new URL("https://domain.com");

		expect(parseUrl(url).data).toBe(url);
	});

	it("Should parse a valid url string", () => {
		expect(parseUrl("https://domain.com/path").data?.toString()).toBe("https://domain.com/path");
	});

	it(`Should return an '${"invalidUrl" satisfies ErrorReason}' error without retry context for an invalid url`, () => {
		const { error } = parseUrl(invalidUrl);

		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
		expect(error?.message).toBe(`Failed to parse url '${invalidUrl}'.`);
		expect(error?.retryAttempt).toBeUndefined();
		expect(error?.retryStrategyOptions).toBeUndefined();
	});

	it("Should carry the provided retry context on the error", () => {
		const retryStrategyOptions = resolveDefaultRetryStrategyOptions();
		const { error } = parseUrl(invalidUrl, { retryStrategyOptions, retryAttempt: 0 });

		expect(error?.retryAttempt).toBe(0);
		expect(error?.retryStrategyOptions).toBe(retryStrategyOptions);
	});
});
