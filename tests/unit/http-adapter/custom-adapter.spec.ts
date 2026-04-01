import { describe, expect, it } from "vitest";
import type { AdapterResponse } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { Header } from "../../../lib/models/core.models.js";
import type { JsonValue } from "../../../lib/models/json.models.js";
import { getFakeBlob } from "../../../lib/testkit/testkit.utils.js";

describe("Custom adapter", () => {
	const headerA: Header = {
		name: "A",
		value: "a",
	};

	const responseData: Pick<AdapterResponse<JsonValue>, "status" | "statusText" | "responseHeaders"> = {
		status: 200,
		statusText: "Ok",
		responseHeaders: [headerA],
	};

	const jsonResponse: JsonValue = {
		message: "ok",
	};

	const blobResponse = getFakeBlob();

	const httpService = getDefaultHttpService({
		adapter: {
			executeRequest: async (options) => {
				const response: AdapterResponse<JsonValue> = {
					responseHeaders: responseData.responseHeaders,
					status: responseData.status,
					url: options.url,
					statusText: responseData.statusText,
					payload: jsonResponse,
				};

				return await Promise.resolve(response);
			},
			downloadFile: async (options) => {
				const response: AdapterResponse<Blob> = {
					responseHeaders: responseData.responseHeaders,
					status: responseData.status,
					url: options.url,
					statusText: responseData.statusText,
					payload: blobResponse,
				};

				return await Promise.resolve(response);
			},
		},
	});

	describe("Json request", async () => {
		const { success, response } = await httpService.request({
			url: "https://domain.com",
			method: "GET",
		});

		it("Success should be true", () => {
			expect(success).toBe(true);
		});

		it("Base response values should be equal to test values", () => {
			expect(response?.adapterResponse.status).toBe(responseData.status);
			expect(response?.adapterResponse.statusText).toBe(responseData.statusText);
		});

		it(`Response should contain header '${headerA.name}'`, () => {
			expect(response?.adapterResponse.responseHeaders.find((m) => m.name === headerA.name)?.value).toStrictEqual(headerA.value);
		});

		it("Json response should be equal to provided json", () => {
			expect(JSON.stringify(response?.payload)).toStrictEqual(JSON.stringify(jsonResponse));
		});
	});

	describe("Download file request", async () => {
		const { success, response } = await httpService.downloadFile({
			url: "https://domain.com",
		});

		it("Success should be true", () => {
			expect(success).toBe(true);
		});

		it("Base response values should be equal to test values", () => {
			expect(response?.adapterResponse.status).toBe(responseData.status);
			expect(response?.adapterResponse.statusText).toBe(responseData.statusText);
		});

		it(`Response should contain header '${headerA.name}'`, () => {
			expect(response?.adapterResponse.responseHeaders.find((m) => m.name === headerA.name)?.value).toStrictEqual(headerA.value);
		});

		it("Blob response should be equal to provided blob", () => {
			expect(response?.payload).toStrictEqual(blobResponse);
		});
	});

	describe("Upload file request", async () => {
		const inputBlob = new Blob(["x"], { type: "text/plain" });

		const { success, response } = await httpService.uploadFile({
			url: "https://domain.com",
			method: "POST",
			body: inputBlob,
		});

		it("Success should be true", () => {
			expect(success).toBe(true);
		});

		it("Base response values should be equal to test values", () => {
			expect(response?.adapterResponse.status).toBe(responseData.status);
			expect(response?.adapterResponse.statusText).toBe(responseData.statusText);
		});

		it(`Response should contain header '${headerA.name}'`, () => {
			expect(response?.adapterResponse.responseHeaders.find((m) => m.name === headerA.name)?.value).toStrictEqual(headerA.value);
		});

		it("Request header should contain content-type header", () => {
			expect(response?.requestHeaders.find((m) => m.name === "Content-Type")?.value).toStrictEqual(inputBlob.type);
		});
		it("Request header should contain content-length header", () => {
			expect(response?.requestHeaders.find((m) => m.name === "Content-Length")?.value).toStrictEqual(inputBlob.size.toString());
		});

		it("Json response should be equal to provided json", () => {
			expect(JSON.stringify(response?.payload)).toStrictEqual(JSON.stringify(jsonResponse));
		});
	});
});
