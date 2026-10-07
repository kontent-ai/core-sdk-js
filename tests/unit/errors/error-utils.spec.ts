import { describe, expect, it } from "vitest";
import type { AdapterResponse } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import {
	AdapterAbortError,
	AdapterParseError,
	type ErrorReason,
	type ErrorResponseData,
	kontentAiErrorBrands,
} from "../../../lib/models/error.models.js";
import { stubFetchWithResponse } from "../../../lib/testkit/testkit.utils.js";
import {
	createSdkError,
	isAdapterAbortError,
	isAdapterParseError,
	isFetchAbortError,
	isKontent404Error,
	isKontentErrorResponseData,
	isKontentSdkError,
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

describe("Error type guards across package copies", () => {
	// simulates an error created by a different copy / version of the core SDK, where `instanceof` fails
	const createForeignError = (brand: symbol): Error => Object.assign(new Error("foreign"), { [brand]: true });

	it.each([
		{ guard: isKontentSdkError, brand: kontentAiErrorBrands.sdkError },
		{ guard: isAdapterAbortError, brand: kontentAiErrorBrands.adapterAbortError },
		{ guard: isAdapterParseError, brand: kontentAiErrorBrands.adapterParseError },
	])("Should recognize branded error from another package copy ($guard.name)", ({ guard, brand }) => {
		expect(guard(createForeignError(brand))).toBe(true);
	});

	it.each([
		{ guard: isKontentSdkError, name: "KontentSdkError" },
		{ guard: isAdapterAbortError, name: "AdapterAbortError" },
		{ guard: isAdapterParseError, name: "AdapterParseError" },
	])("Should not recognize unbranded error with the same name ($name)", ({ guard, name }) => {
		expect(guard(Object.assign(new Error("foreign"), { name }))).toBe(false);
	});

	it.each([null, undefined, "error", 42])("Should return false for non-object value '%s'", (value) => {
		expect(isKontentSdkError(value)).toBe(false);
	});

	it("Should recognize instances created by this package", () => {
		expect(isAdapterAbortError(new AdapterAbortError({ message: "" }))).toBe(true);
		expect(isAdapterParseError(new AdapterParseError({ message: "" }))).toBe(true);
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
						adapterResponse: undefined,
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
						adapterResponse: undefined,
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

const testUrl = new URL("https://domain.com");

describe("Invalid response error - adapterResponse attachment", () => {
	it("Should attach the raw adapterResponse when the error body conforms to the Kontent error schema", async () => {
		const jsonResponse = { message: "Not found.", request_id: "abc-123", error_code: 100 };
		stubFetchWithResponse(() => Response.json(jsonResponse, { status: 404 }));

		const { error } = await getDefaultHttpService().request({ url: "https://domain.com", method: "GET" });

		const invalidResponseReason = "notFound" satisfies ErrorReason;
		if (error?.details.reason !== invalidResponseReason) {
			throw new Error(`Expected error reason to be '${invalidResponseReason}'`);
		}

		expect(error.details.kontentErrorResponse).toBeDefined();
		expect(error.details.adapterResponse?.payload).toStrictEqual(jsonResponse);
	});

	it("Should attach the raw adapterResponse even when the error body does not conform to the Kontent error schema", async () => {
		const nonConformingPayload = { unexpected: "shape" };
		stubFetchWithResponse(() => Response.json(nonConformingPayload, { status: 500 }));

		const { error } = await getDefaultHttpService().request({ url: "https://domain.com", method: "GET" });

		const invalidResponseReason = "invalidResponse" satisfies ErrorReason;
		if (error?.details.reason !== invalidResponseReason) {
			throw new Error(`Expected error reason to be '${invalidResponseReason}'`);
		}

		expect(error.details.kontentErrorResponse).toBeUndefined();
		expect(error.details.adapterResponse?.payload).toStrictEqual(nonConformingPayload);
	});
});

describe("Invalid response error - message", () => {
	it.each([
		{ statusCode: 404, reason: "notFound" },
		{ statusCode: 401, reason: "unauthorized" },
		{ statusCode: 400, reason: "invalidResponse" },
	] as const)("Should include the Kontent API message exactly once for status $statusCode", async ({ statusCode, reason }) => {
		const jsonResponse = { message: "API error detail.", request_id: "abc-123", error_code: 100 } satisfies ErrorResponseData;
		stubFetchWithResponse(() => Response.json(jsonResponse, { status: statusCode }));

		const { error } = await getDefaultHttpService().request({ url: testUrl, method: "GET" });

		if (error?.details.reason !== (reason satisfies ErrorReason) || !error.details.adapterResponse) {
			throw new Error(`Expected error reason to be '${reason}' with an adapter response`);
		}

		expect(error.message).toStrictEqual(
			toInvalidResponseMessage({
				method: "GET",

				adapterResponse: error.details.adapterResponse,
				kontentErrorData: error.details.kontentErrorResponse,
			}),
		);
		expect(error.message.split(jsonResponse.message)).toHaveLength(2);
	});
});

const adapterResponse: AdapterResponse<null> = {
	responseHeaders: [],
	status: 422,
	statusText: "Unprocessable Entity",
	url: new URL("https://domain.com"),
	payload: null,
};

describe("toInvalidResponseMessage", () => {
	it("Should include status and statusText when no kontentErrorResponse is provided", () => {
		expect(
			toInvalidResponseMessage({
				method: "GET",

				adapterResponse,
				kontentErrorData: undefined,
			}),
		).toStrictEqual(
			`Failed to execute 'GET' request '${testUrl.toString()}'. Request failed with status '422' and status text 'Unprocessable Entity'.`,
		);
	});

	it("Should include validation error fields with zero values", () => {
		const kontentErrorResponse: ErrorResponseData = {
			message: "Validation failed.",
			request_id: "abc-123",
			error_code: 200,
			validation_errors: [{ message: "Invalid value.", line: 0, position: 0 }],
		};

		expect(
			toInvalidResponseMessage({
				method: "GET",
				adapterResponse,
				kontentErrorData: kontentErrorResponse,
			}),
		).toStrictEqual(
			`Failed to execute 'GET' request '${testUrl.toString()}'. Request failed with status '422' and status text 'Unprocessable Entity'. Validation failed. Invalid value. (line: 0, position: 0)`,
		);
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

				adapterResponse,
				kontentErrorData: kontentErrorResponse,
			}),
		).toStrictEqual(
			`Failed to execute 'GET' request '${testUrl.toString()}'. Request failed with status '422' and status text 'Unprocessable Entity'. Validation failed. Invalid value. (path: /items/0/name, line: 3, position: 12)`,
		);
	});
});
