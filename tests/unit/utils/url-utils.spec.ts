import { describe, expect, it } from "vitest";
import { getEndpointUrl } from "../../../lib/utils/url.utils.js";

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
});
