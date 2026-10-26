import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { AdapterAbortError, AdapterParseError, type BaseErrorData, KontentSdkError } from "../../../lib/models/error.models.js";

const baseErrorData: BaseErrorData = {
	message: "Something failed",
	url: "https://domain.com",
	retryStrategyOptions: undefined,
	retryAttempt: undefined,
};

describe("Error class names", () => {
	it.each([
		{
			error: new KontentSdkError({ baseErrorData, details: { reason: "adapterError", originalError: undefined } }),
			name: "KontentSdkError",
		},
		{ error: new AdapterAbortError({ message: "aborted" }), name: "AdapterAbortError" },
		{ error: new AdapterParseError({ message: "parse failed" }), name: "AdapterParseError" },
	])("$name should expose its class name", ({ error, name }) => {
		expect(error.name).toBe(name);
		expect(String(error).startsWith(`${name}:`)).toBe(true);
	});
});

describe("KontentSdkError cause", () => {
	it("Should set cause to the original error", () => {
		const originalError = new Error("Network failure");
		const error = new KontentSdkError({ baseErrorData, details: { reason: "adapterError", originalError } });

		expect(error.cause).toBe(originalError);
	});

	it("Should set cause to the schema issues when response parsing failed", () => {
		const issues: readonly StandardSchemaV1.Issue[] = [{ message: "Expected string, received number" }];
		const error = new KontentSdkError({
			baseErrorData,
			details: { reason: "schemaMismatch", issues, payload: 1, url: new URL("https://domain.com") },
		});

		expect(error.cause).toBe(issues);
	});

	it("Should not set cause when there is no underlying error", () => {
		const error = new KontentSdkError({
			baseErrorData,
			details: {
				reason: "notFound",
				kontentErrorResponse: undefined,
				adapterResponse: {
					status: 404,
					statusText: "Not Found",
					responseHeaders: [],
					url: new URL("https://domain.com"),
					payload: null,
				},
			},
		});

		expect("cause" in error).toBe(false);
	});
});

describe("Adapter error cause", () => {
	it.each([
		{ ErrorClass: AdapterAbortError, title: "AdapterAbortError" },
		{ ErrorClass: AdapterParseError, title: "AdapterParseError" },
	])("$title should keep the inner error only in cause", ({ ErrorClass }) => {
		const innerError = new Error("inner");
		const error = new ErrorClass({ message: "failed", error: innerError });

		expect(error.cause).toBe(innerError);
		expect(Object.hasOwn(error, "details")).toBe(false);
	});
});
