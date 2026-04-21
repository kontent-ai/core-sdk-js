import { describe, expect, it } from "vitest";
import type { AdapterResponse } from "../../../lib/http/http.models.js";
import type { ErrorResponseData } from "../../../lib/models/error.models.js";
import type { ErrorDetails } from "../../../lib/public_api.js";
import {
	createSdkError,
	isFetchAbortError,
	isKontent404Error,
	isKontentErrorResponseData,
	toFriendlyKontentSdkErrorMessage,
	toInvalidResponseMessage,
} from "../../../lib/utils/error.utils.js";

describe("isAbortError", () => {
	it("Should return false when error is null", () => {
		expect(isFetchAbortError(null)).toBe(false);
	});

	it("Should return false when error is a string", () => {
		expect(isFetchAbortError("AbortError")).toBe(false);
	});

	it("Should return false when error is an object without a name property", () => {
		expect(isFetchAbortError({ message: "Something went wrong" })).toBe(false);
	});

	it("Should return false when error has a name that is not 'AbortError'", () => {
		expect(isFetchAbortError(new Error("Something went wrong"))).toBe(false);
	});

	it("Should return true when error is a DOMException with name 'AbortError'", () => {
		expect(isFetchAbortError(new DOMException("The operation was aborted.", "AbortError"))).toBe(true);
	});
});

describe("isKontent404Error", () => {
	it("Should evaluate to true when error is a Kontent AI not found error", () => {
		expect(
			isKontent404Error(
				createSdkError({
					baseErrorData: {
						message: "",
						url: "",
						retryAttempt: undefined,
						retryStrategyOptions: undefined,
					},
					details: {
						reason: "notFound",
						status: 404,
						statusText: "",
						responseHeaders: [],
						kontentErrorResponse: undefined,
					},
				}),
			),
		).toBe(true);
	});

	it("Should evaluate to false when error is not a Kontent AI not found error", () => {
		expect(
			isKontent404Error(
				createSdkError({
					baseErrorData: {
						message: "",
						url: "",
						retryAttempt: undefined,
						retryStrategyOptions: undefined,
					},
					details: {
						reason: "invalidResponse",
						status: 404,
						statusText: "",
						responseHeaders: [],
						kontentErrorResponse: undefined,
					},
				}),
			),
		).toBe(false);
	});
});

describe("isKontentErrorResponseData", () => {
	it("Should return false when JSON is null", () => {
		expect(isKontentErrorResponseData(null)).toBe(false);
	});

	it("Should return false when JSON is a string", () => {
		expect(isKontentErrorResponseData("Not an object")).toBe(false);
	});

	it("Should return false when JSON is an array", () => {
		expect(isKontentErrorResponseData([1, 2, 3])).toBe(false);
	});

	it("Should return true when JSON is a Kontent API error response data", () => {
		expect(
			isKontentErrorResponseData({
				message: "Error message",
				request_id: "123",
				error_code: 0,
			} satisfies ErrorResponseData),
		).toBe(true);
	});

	it("Should return false when error JSON is missing required properties", () => {
		expect(
			isKontentErrorResponseData({
				message: "Error message",
				error_code: 0,
			} satisfies Omit<ErrorResponseData, "request_id">),
		).toBe(false);

		expect(
			isKontentErrorResponseData({
				request_id: "123",
				error_code: 0,
			} satisfies Omit<ErrorResponseData, "message">),
		).toBe(false);

		expect(
			isKontentErrorResponseData({
				message: "Error message",
				request_id: "123",
			} satisfies Omit<ErrorResponseData, "error_code">),
		).toBe(false);
	});
});

const baseMessage = "Base error message.";

const kontentErrorResponse = {
	message: "API error detail.",
	request_id: "abc-123",
	error_code: 100,
} as const;

const responseErrorBase = {
	status: 404 as const,
	statusText: "Not Found",
	responseHeaders: [],
} as const;

describe("toFriendlyKontentSdkErrorMessage", () => {
	it("Should append kontentErrorResponse message for 'invalidResponse' with non-null kontentErrorResponse", () => {
		const error: ErrorDetails = {
			reason: "invalidResponse",
			kontentErrorResponse,
			...responseErrorBase,
		};

		expect(toFriendlyKontentSdkErrorMessage(baseMessage, error)).toStrictEqual(`${baseMessage} ${kontentErrorResponse.message}`);
	});

	it("Should return base message for 'invalidResponse' when kontentErrorResponse is undefined", () => {
		const error: ErrorDetails = {
			reason: "invalidResponse",
			kontentErrorResponse: undefined,
			...responseErrorBase,
		};

		expect(toFriendlyKontentSdkErrorMessage(baseMessage, error)).toStrictEqual(baseMessage);
	});
});

const adapterResponse: AdapterResponse<null> = {
	responseHeaders: [],
	status: 422,
	statusText: "Unprocessable Entity",
	url: new URL("https://domain.com"),
	payload: null,
};

const testUrl = new URL("https://domain.com");

describe("toInvalidResponseMessage", () => {
	it("Should return base message when no kontentErrorResponse is provided", () => {
		expect(
			toInvalidResponseMessage({
				method: "GET",
				url: testUrl,
				adapterResponse,
				kontentErrorData: undefined,
			}),
		).toStrictEqual(`Failed to execute 'GET' request '${testUrl.toString()}'.`);
	});

	it("Should include status, statusText and API message when kontentErrorResponse is provided", () => {
		const kontentErrorResponse: ErrorResponseData = {
			message: "Item not found.",
			request_id: "abc-123",
			error_code: 100,
		};

		expect(
			toInvalidResponseMessage({
				method: "POST",
				url: testUrl,
				adapterResponse,
				kontentErrorData: kontentErrorResponse,
			}),
		).toStrictEqual(
			`Failed to execute 'POST' request '${testUrl.toString()}'. Request failed with status '422' and status text 'Unprocessable Entity'. Item not found.`,
		);
	});

	it("Should append validation error message without optional fields", () => {
		const kontentErrorResponse: ErrorResponseData = {
			message: "Validation failed.",
			request_id: "abc-123",
			error_code: 200,
			validation_errors: [{ message: "Field is required." }],
		};

		expect(
			toInvalidResponseMessage({
				method: "PUT",
				url: testUrl,
				adapterResponse,
				kontentErrorData: kontentErrorResponse,
			}),
		).toStrictEqual(
			`Failed to execute 'PUT' request '${testUrl.toString()}'. Request failed with status '422' and status text 'Unprocessable Entity'. Validation failed. Field is required.`,
		);
	});

	it("Should append validation error message with all optional fields", () => {
		const kontentErrorResponse: ErrorResponseData = {
			message: "Validation failed.",
			request_id: "abc-123",
			error_code: 200,
			validation_errors: [{ message: "Invalid value.", path: "/items/0/name", line: 3, position: 12 }],
		};

		expect(
			toInvalidResponseMessage({
				method: "GET",
				url: testUrl,
				adapterResponse,
				kontentErrorData: kontentErrorResponse,
			}),
		).toStrictEqual(
			`Failed to execute 'GET' request '${testUrl.toString()}'. Request failed with status '422' and status text 'Unprocessable Entity'. Validation failed. Invalid value. (path: /items/0/name, line: 3, position: 12)`,
		);
	});
});
