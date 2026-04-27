import { describe, expect, it } from "vitest";
import { inspectQuery } from "../../../lib/sdk/resolve-query.js";
import { getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

describe("Query base url with https protocol", () => {
	const { data } = inspectQuery({
		config: { baseUrl: { protocol: "https", host: "kontent.ai" } },
		url: new URL("https://domain.com/api/path"),
		body: null,
		method: "GET",
		sdkInfo: getTestSdkInfo(),
		mapError: (error) => error,
	});

	it("Should override base url of the url", () => {
		expect(data?.url).toStrictEqual(new URL("https://kontent.ai/api/path"));
	});
});

describe("Query base url with http protocol", () => {
	const { data } = inspectQuery({
		config: { baseUrl: { protocol: "http", host: "kontent.ai" } },
		url: new URL("https://domain.com/api/path"),
		body: null,
		method: "GET",
		sdkInfo: getTestSdkInfo(),
		mapError: (error) => error,
	});

	it("Should override base url of the url", () => {
		expect(data?.url).toStrictEqual(new URL("http://kontent.ai/api/path"));
	});
});

describe("Query base url with host including port", () => {
	const { data } = inspectQuery({
		config: { baseUrl: { protocol: "http", host: "localhost:3000" } },
		url: new URL("https://domain.com/api/path"),
		body: null,
		method: "GET",
		sdkInfo: getTestSdkInfo(),
		mapError: (error) => error,
	});

	it("Should override base url of the url", () => {
		expect(data?.url).toStrictEqual(new URL("http://localhost:3000/api/path"));
	});
});
