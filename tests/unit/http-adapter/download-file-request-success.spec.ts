import { afterAll, describe, expect, it, vi } from "vitest";
import type { HttpServiceStatus } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { HttpMethod } from "../../../lib/models/core.models.js";
import { getFakeBlob, mockGlobalFetchBlobResponse } from "../../../lib/testkit/testkit.utils.js";

const fakeBlob = getFakeBlob();

describe("Download file - Success", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	mockGlobalFetchBlobResponse({
		blobResponse: fakeBlob,
		statusCode: 200,
	});

	const { success, response } = await getDefaultHttpService().downloadFile({
		url: "https://domain.com/image.jpg",
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Status should be 200", () => {
		expect(response?.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Method should be GET", () => {
		expect(response?.method).toStrictEqual<HttpMethod>("GET");
	});

	it("Blob should be the same as the fake blob", () => {
		expect(response?.payload).toBeInstanceOf(Blob);
		expect(response?.payload).toStrictEqual(fakeBlob);
	});
});
