import { describe, expect, it } from "vitest";
import type { AdapterResponse } from "../../../lib/http/http.models.js";
import type { ErrorResponseData } from "../../../lib/models/error.models.js";
import { toInvalidResponseMessage } from "../../../lib/utils/error.utils.js";

const adapterResponse: AdapterResponse<null> = {
	responseHeaders: [],
	status: 422,
	statusText: "Unprocessable Entity",
	url: "https://domain.com",
	payload: null,
};

describe("toInvalidResponseMessage utility function", () => {
	it("Should return base message when no kontentErrorResponse is provided", () => {
		expect(
			toInvalidResponseMessage({
				method: "GET",
				url: "https://domain.com",
				adapterResponse,
			}),
		).toStrictEqual("Failed to execute 'GET' request 'https://domain.com'.");
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
				url: "https://domain.com",
				adapterResponse,
				kontentErrorResponse,
			}),
		).toStrictEqual(
			"Failed to execute 'POST' request 'https://domain.com'. Request failed with status '422' and status text 'Unprocessable Entity'.Item not found.",
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
				url: "https://domain.com",
				adapterResponse,
				kontentErrorResponse,
			}),
		).toStrictEqual(
			"Failed to execute 'PUT' request 'https://domain.com'. Request failed with status '422' and status text 'Unprocessable Entity'.Validation failed. Field is required.",
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
				url: "https://domain.com",
				adapterResponse,
				kontentErrorResponse,
			}),
		).toStrictEqual(
			"Failed to execute 'GET' request 'https://domain.com'. Request failed with status '422' and status text 'Unprocessable Entity'.Validation failed. Invalid value. (path: /items/0/name, line: 3, position: 12)",
		);
	});

	it("Should join multiple validation errors with a comma", () => {
		const kontentErrorResponse: ErrorResponseData = {
			message: "Validation failed.",
			request_id: "abc-123",
			error_code: 200,
			validation_errors: [
				{ message: "Field is required.", path: "/name" },
				{ message: "Value out of range.", line: 7 },
			],
		};

		expect(
			toInvalidResponseMessage({
				method: "PATCH",
				url: "https://domain.com",
				adapterResponse,
				kontentErrorResponse,
			}),
		).toStrictEqual(
			"Failed to execute 'PATCH' request 'https://domain.com'. Request failed with status '422' and status text 'Unprocessable Entity'.Validation failed. Field is required. (path: /name), Value out of range. (line: 7)",
		);
	});
});
