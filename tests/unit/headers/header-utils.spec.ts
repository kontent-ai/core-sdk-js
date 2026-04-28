import { describe, expect, it } from "vitest";
import type { Header, KnownHeaderName, SdkInfo } from "../../../lib/models/core.models.js";
import {
	createAuthorizationHeader,
	createContinuationHeader,
	createSdkIdHeader,
	getRetryAfterHeaderValue,
} from "../../../lib/utils/header.utils.js";

describe("getSdkIdHeader", () => {
	it("Should return a header with name 'X-KC-SDKID'", () => {
		const info: SdkInfo = { host: "sdk", name: "test-sdk", version: "1.0.0" };

		expect(createSdkIdHeader(info).name).toStrictEqual("X-KC-SDKID" satisfies KnownHeaderName);
	});

	it("Should format the value as 'host;name;version'", () => {
		const info: SdkInfo = { host: "sdk", name: "test-sdk", version: "1.0.0" };

		expect(createSdkIdHeader(info).value).toStrictEqual("sdk;test-sdk;1.0.0");
	});
});

describe("createContinuationHeader", () => {
	it("Should return a header with name 'X-Continuation'", () => {
		expect(createContinuationHeader("token").name).toStrictEqual("X-Continuation" satisfies KnownHeaderName);
	});

	it("Should set the token as the header value", () => {
		const token = "continuation-token-123";

		expect(createContinuationHeader(token).value).toStrictEqual(token);
	});
});

describe("getRetryAfterHeaderValue - empty string", () => {
	it("Should return undefined for an empty string value", () => {
		const headers: readonly Header[] = [{ name: "Retry-After" satisfies KnownHeaderName, value: "" }];

		expect(getRetryAfterHeaderValue(headers)).toBeUndefined();
	});
});

describe("createAuthorizationHeader", () => {
	it("Should return a header with name 'Authorization'", () => {
		expect(createAuthorizationHeader("api-key").name).toStrictEqual("Authorization" satisfies KnownHeaderName);
	});

	it("Should prefix the api key with 'Bearer '", () => {
		const apiKey = "my-api-key";

		expect(createAuthorizationHeader(apiKey).value).toStrictEqual(`Bearer ${apiKey}`);
	});
});
