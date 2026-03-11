import { afterAll, describe, expect, it, vi } from "vitest";
import type { HttpServiceStatus } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { HttpMethod } from "../../../lib/models/core.models.js";
import { mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";

type ResponseData = {
	readonly codename: string;
};

type RequestBody = {
	readonly id: string;
};

const responseData: ResponseData = {
	codename: "x",
};

const requestBody: RequestBody = {
	id: "1",
};

const method: HttpMethod = "POST";

describe("Execute request - Success (POST)", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	mockGlobalFetchJsonResponse({
		jsonResponse: responseData,
		statusCode: 200,
	});

	const { success, response, error } = await getDefaultHttpService().request<ResponseData, RequestBody>({
		url: "https://domain.com",
		method,
		body: requestBody,
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Status should be 200", () => {
		expect(response?.adapterResponse.status).toStrictEqual(200);
	});

	it("Response data should be set", () => {
		expect(response?.payload).toStrictEqual(responseData);
	});

	it("Response body should be set", () => {
		expect(response?.body).toBe(requestBody);
	});

	it(`Response method should be set`, () => {
		expect(response?.method).toStrictEqual(method);
	});
});

describe("Execute request - Success (POST)", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const requestBody: {
		readonly id: number;
		readonly codename: string;
	} = {
		id: 1,
		codename: "x",
	};

	mockGlobalFetchJsonResponse({
		jsonResponse: responseData,
		statusCode: 200,
	});

	const { success, response, error } = await getDefaultHttpService().request<
		ResponseData,
		{ readonly id: number; readonly codename: string }
	>({
		url: "https://domain.com",
		method: "POST",
		body: requestBody,
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Status should be 200", () => {
		expect(response?.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Response data should be set", () => {
		expect(response?.payload).toStrictEqual(responseData);
	});

	it("Response body should be set", () => {
		expect(response?.body).toStrictEqual(requestBody);
	});

	it("Response method should be POST", () => {
		expect(response?.method).toStrictEqual<HttpMethod>("POST");
	});
});
