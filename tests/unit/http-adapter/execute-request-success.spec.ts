import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { HttpMethod } from "../../../lib/models/core.models.js";
import { stubFetchWithResponse } from "../../../lib/testkit/testkit.utils.js";

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
	stubFetchWithResponse(() => Response.json(responseData));

	const { success, response } = await getDefaultHttpService().request<RequestBody>({
		url: "https://domain.com",
		method,
		body: requestBody,
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
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
