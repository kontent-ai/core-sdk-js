import { describe, expect, it } from "vitest";
import type { CommonHeaderNames, SDKInfo } from "../../../lib/models/core.models.js";
import { createAuthorizationHeader, createContinuationHeader, getSdkIdHeader } from "../../../lib/utils/header.utils.js";

describe("getSdkIdHeader", () => {
	it("Should return a header with name 'X-KC-SDKID'", () => {
		const info: SDKInfo = { host: "sdk", name: "test-sdk", version: "1.0.0" };

		expect(getSdkIdHeader(info).name).toStrictEqual("X-KC-SDKID" satisfies CommonHeaderNames);
	});

	it("Should format the value as 'host;name;version'", () => {
		const info: SDKInfo = { host: "sdk", name: "test-sdk", version: "1.0.0" };

		expect(getSdkIdHeader(info).value).toStrictEqual("sdk;test-sdk;1.0.0");
	});
});

describe("createContinuationHeader", () => {
	it("Should return a header with name 'X-Continuation'", () => {
		expect(createContinuationHeader("token").name).toStrictEqual("X-Continuation" satisfies CommonHeaderNames);
	});

	it("Should set the token as the header value", () => {
		const token = "continuation-token-123";

		expect(createContinuationHeader(token).value).toStrictEqual(token);
	});
});

describe("createAuthorizationHeader", () => {
	it("Should return a header with name 'Authorization'", () => {
		expect(createAuthorizationHeader("api-key").name).toStrictEqual("Authorization" satisfies CommonHeaderNames);
	});

	it("Should prefix the api key with 'Bearer '", () => {
		const apiKey = "my-api-key";

		expect(createAuthorizationHeader(apiKey).value).toStrictEqual(`Bearer ${apiKey}`);
	});
});
