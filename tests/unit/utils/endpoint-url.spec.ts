import { describe, expect, it } from "vitest";
import { getEndpointUrl } from "../../../lib/utils/url.utils.js";

describe("getEndpointUrl", () => {
	it("Combines baseUrl, environmentId and path with single slashes", () => {
		const url = getEndpointUrl({
			baseUrl: "https://deliver.kontent.ai",
			environmentId: "env-id",
			path: "items",
		});

		expect(url).toBe("https://deliver.kontent.ai/env-id/items");
	});

	it("Normalizes duplicate slashes between segments", () => {
		const url = getEndpointUrl({
			baseUrl: "https://deliver.kontent.ai/",
			environmentId: "/env-id/",
			path: "/items/",
		});

		expect(url).toBe("https://deliver.kontent.ai/env-id/items/");
	});

	it("Removes trailing slashes from baseUrl", () => {
		const url = getEndpointUrl({
			baseUrl: "https://deliver.kontent.ai///",
			environmentId: "env-id",
			path: "items/123",
		});

		expect(url).toBe("https://deliver.kontent.ai/env-id/items/123");
	});
});
