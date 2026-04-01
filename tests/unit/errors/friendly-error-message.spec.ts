import { describe, expect, it } from "vitest";
import type { ErrorDetails } from "../../../lib/public_api.js";
import { toFriendlyKontentSdkErrorMessage } from "../../../lib/utils/error.utils.js";

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

	it("Should append kontentErrorResponse message for 'notFound' with non-null kontentErrorResponse", () => {
		const error: ErrorDetails = {
			reason: "notFound",
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

	it("Should return base message for 'notFound' when kontentErrorResponse is undefined", () => {
		const error: ErrorDetails = {
			reason: "notFound",
			kontentErrorResponse: undefined,
			...responseErrorBase,
		};

		expect(toFriendlyKontentSdkErrorMessage(baseMessage, error)).toStrictEqual(baseMessage);
	});

	it("Should return base message for any other reason", () => {
		const error: ErrorDetails = {
			reason: "adapterError",
			originalError: new Error("Network failure"),
		};

		expect(toFriendlyKontentSdkErrorMessage(baseMessage, error)).toStrictEqual(baseMessage);
	});
});
