import { describe, expect, it } from "vitest";
import type { CommonHeaderNames, Header, SDKInfo } from "../../../lib/models/core.models.js";
import {
	createAuthorizationHeader,
	createContinuationHeader,
	getRetryAfterHeaderValue,
	getSdkIdHeader,
} from "../../../lib/utils/header.utils.js";

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

describe("getRetryAfterHeaderValue - empty string", () => {
	it("Should return undefined for an empty string value", () => {
		const headers: readonly Header[] = [{ name: "Retry-After" satisfies CommonHeaderNames, value: "" }];

		expect(getRetryAfterHeaderValue(headers)).toBeUndefined();
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
