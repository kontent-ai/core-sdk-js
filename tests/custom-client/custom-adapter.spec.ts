import { describe, expect, it } from "vitest";
import { getFakeBlob } from "../../lib/devkit/test.utils.js";
import type { AdapterResponse } from "../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import type { Header } from "../../lib/models/core.models.js";
import type { JsonValue } from "../../lib/models/json.models.js";

describe("Custom adapter", async () => {
	const headerA: Header = {
		name: "A",
		value: "a",
	};

	const responseData: Pick<AdapterResponse, "status" | "statusText" | "isValidResponse" | "responseHeaders"> = {
		status: 200,
		statusText: "Ok",
		isValidResponse: true,
		responseHeaders: [headerA],
	};

	const jsonResponse: JsonValue = {
		message: "ok",
	};

	const blobResponse = getFakeBlob();

	const httpService = await getDefaultHttpService({
		adapter: {
			requestAsync: async () => {
				return await Promise.resolve({
					isValidResponse: true,
					responseHeaders: responseData.responseHeaders,
					status: responseData.status,
					statusText: responseData.statusText,
					toJsonAsync: async () => jsonResponse,
					toBlobAsync: async () => blobResponse,
				});
			},
		},
	});

	describe("Json request", async () => {
		const { success, data, error } = await httpService.requestAsync({
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

		it("Base response values should be equal to test values", () => {
			expect(data?.adapterResponse.isValidResponse).toBe(responseData.isValidResponse);
			expect(data?.adapterResponse.status).toBe(responseData.status);
			expect(data?.adapterResponse.statusText).toBe(responseData.statusText);
		});

		it(`Response should contain header '${headerA.name}'`, () => {
			expect(data?.adapterResponse.responseHeaders.find((m) => m.name === headerA.name)?.value).toStrictEqual(headerA.value);
		});

		it("Json response should be equal to provided json", () => {
			expect(JSON.stringify(data?.responseData)).toStrictEqual(JSON.stringify(jsonResponse));
		});
	});

	describe("Download file request", async () => {
		const { success, data, error } = await httpService.downloadFileAsync({
			url: "https://domain.com",
		});

		it("Success should be true", () => {
			expect(success).toBe(true);
		});

		it("Error should be undefined", () => {
			expect(error).toBeUndefined();
		});

		it("Base response values should be equal to test values", () => {
			expect(data?.adapterResponse.isValidResponse).toBe(responseData.isValidResponse);
			expect(data?.adapterResponse.status).toBe(responseData.status);
			expect(data?.adapterResponse.statusText).toBe(responseData.statusText);
		});

		it(`Response should contain header '${headerA.name}'`, () => {
			expect(data?.adapterResponse.responseHeaders.find((m) => m.name === headerA.name)?.value).toStrictEqual(headerA.value);
		});

		it("Blob response should be equal to provided blob", () => {
			expect(data?.responseData).toStrictEqual(blobResponse);
		});
	});

	describe("Upload file request", async () => {
		const inputBlob = new Blob(["x"], { type: "text/plain" });

		const { success, data, error } = await httpService.uploadFileAsync({
			url: "https://domain.com",
			method: "POST",
			body: inputBlob,
		});

		it("Success should be true", () => {
			expect(success).toBe(true);
		});

		it("Error should be undefined", () => {
			expect(error).toBeUndefined();
		});

		it("Base response values should be equal to test values", () => {
			expect(data?.adapterResponse.isValidResponse).toBe(responseData.isValidResponse);
			expect(data?.adapterResponse.status).toBe(responseData.status);
			expect(data?.adapterResponse.statusText).toBe(responseData.statusText);
		});

		it(`Response should contain header '${headerA.name}'`, () => {
			expect(data?.adapterResponse.responseHeaders.find((m) => m.name === headerA.name)?.value).toStrictEqual(headerA.value);
		});

		it("Request header should contain content-type header", () => {
			expect(data?.requestHeaders.find((m) => m.name === "Content-Type")?.value).toStrictEqual(inputBlob.type);
		});
		it("Request header should contain content-length header", () => {
			expect(data?.requestHeaders.find((m) => m.name === "Content-Length")?.value).toStrictEqual(inputBlob.size.toString());
		});

		it("Json response should be equal to provided json", () => {
			expect(JSON.stringify(data?.responseData)).toStrictEqual(JSON.stringify(jsonResponse));
		});
	});
});
