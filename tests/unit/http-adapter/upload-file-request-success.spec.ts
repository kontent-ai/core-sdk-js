import { describe, expect, it } from "vitest";
import type { HttpStatusCode } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { HttpMethod } from "../../../lib/models/core.models.js";
import { getFakeBlob, stubFetchWithResponse } from "../../../lib/testkit/testkit.utils.js";

const fakeBlob = getFakeBlob();

describe("Upload file - Success", async () => {
	stubFetchWithResponse(() => Response.json({ id: "x" }));

	const { success, response } = await getDefaultHttpService({
		retryStrategy: {
			maxRetries: 0,
		},
	}).uploadFile<{
		readonly id: string;
	}>({
		url: "https://domain.com",
		body: fakeBlob,
		method: "POST",
		requestHeaders: [
			{
				name: "Content-type",
				value: fakeBlob.type,
			},
		],
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Status should be 200", () => {
		expect(response?.adapterResponse.status).toStrictEqual<HttpStatusCode>(200);
	});

	it("Method should be POST", () => {
		expect(response?.method).toStrictEqual<HttpMethod>("POST");
	});
});
