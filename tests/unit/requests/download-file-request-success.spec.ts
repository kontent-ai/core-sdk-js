import { afterAll, describe, expect, it, vi } from "vitest";
import type { HttpServiceStatus } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { HttpMethod } from "../../../lib/models/core.models.js";
import { getFakeBlob, getFetchBlobMock } from "../../../lib/testkit/test.utils.js";

const fakeBlob = getFakeBlob();

describe("Download file - Success", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchBlobMock({
		blob: fakeBlob,
		status: 200,
	});

	const { success, response, error } = await getDefaultHttpService().downloadFileAsync({
		url: "https://domain.com/image.jpg",
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

	it("Method should be GET", () => {
		expect(response?.method).toStrictEqual<HttpMethod>("GET");
	});

	it("Blob should be the same as the fake blob", () => {
		expect(response?.data).toBeInstanceOf(Blob);
		expect(response?.data).toStrictEqual(fakeBlob);
	});
});
