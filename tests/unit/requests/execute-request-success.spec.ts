import { afterAll, describe, expect, it, vi } from "vitest";
import type { HttpServiceStatus } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { HttpMethod } from "../../../lib/models/core.models.js";
import { mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";

type ResponseData = {
	readonly codename: string;
};

const responseData: ResponseData = {
	codename: "x",
};

describe("Execute request - Success (GET)", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	mockGlobalFetchJsonResponse({
		jsonResponse: responseData,
		statusCode: 200,
	});

	const { success, response, error } = await getDefaultHttpService().requestAsync<ResponseData, null>({
		url: "https://domain.com",
		method: "GET",
		body: null,
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
		expect(response?.data).toStrictEqual(responseData);
	});

	it("Response body should be null", () => {
		expect(response?.body).toBeNull();
	});

	it("Response method should be GET", () => {
		expect(response?.method).toStrictEqual("GET");
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

	const { success, response, error } = await getDefaultHttpService().requestAsync<
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
		expect(response?.data).toStrictEqual(responseData);
	});

	it("Response body should be set", () => {
		expect(response?.body).toStrictEqual(requestBody);
	});

	it("Response method should be POST", () => {
		expect(response?.method).toStrictEqual<HttpMethod>("POST");
	});
});
