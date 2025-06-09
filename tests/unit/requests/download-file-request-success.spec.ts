import { afterAll, describe, expect, it, vi } from "vitest";
import { getFakeBlob, getFetchBlobMock } from "../../../lib/devkit/test.utils.js";
import type { HttpServiceStatus } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { HttpMethod } from "../../../lib/models/core.models.js";

const fakeBlob = getFakeBlob();

describe("Download file - Success", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchBlobMock({
		blob: fakeBlob,
		status: 200,
	});

	const { success, data, error } = await getDefaultHttpService().downloadFileAsync({
		url: "https://domain.com/image.jpg",
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Status should be 200", () => {
		expect(data?.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Method should be GET", () => {
		expect(data?.method).toStrictEqual<HttpMethod>("GET");
	});

	it("Blob should be the same as the fake blob", () => {
		expect(data?.responseData).toBeInstanceOf(Blob);
		expect(data?.responseData).toStrictEqual(fakeBlob);
	});
});
