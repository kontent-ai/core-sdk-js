import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { KnownHeaderName } from "../../../lib/models/core.models.js";
import type { ErrorReason } from "../../../lib/models/error.models.js";
import { stubFetchWithResponse } from "../../../lib/testkit/testkit.utils.js";

const testUrl = "https://domain.com";
const contentTypeHeaderName = "Content-Type" satisfies KnownHeaderName;

describe("Default adapter - non-JSON response body", () => {
	it("Should cancel the unread body of a successful non-JSON response", async () => {
		const response = new Response("plain text", { status: 200, headers: { [contentTypeHeaderName]: "text/plain" } });
		stubFetchWithResponse(() => response);

		const result = await getDefaultHttpService().request({ url: testUrl, method: "GET" });

		expect(result.success).toBe(true);
		expect(result.response?.payload).toBeNull();
		expect(response.bodyUsed).toBe(true);
	});

	it("Should cancel the unread body of a failed non-JSON response", async () => {
		const response = new Response("<html>Bad gateway</html>", { status: 502, headers: { [contentTypeHeaderName]: "text/html" } });
		stubFetchWithResponse(() => response);

		const { error } = await getDefaultHttpService().request({ url: testUrl, method: "GET" });

		expect(error?.details.reason).toStrictEqual("invalidResponse" satisfies ErrorReason);
		expect(response.bodyUsed).toBe(true);
	});

	it("Should succeed when the response has no body", async () => {
		stubFetchWithResponse(() => new Response(null, { status: 204 }));

		const result = await getDefaultHttpService().request({ url: testUrl, method: "DELETE" });

		expect(result.success).toBe(true);
		expect(result.response?.payload).toBeNull();
	});

	it("Should still parse a JSON response body", async () => {
		const json = { codename: "x" };
		stubFetchWithResponse(() => Response.json(json));

		const result = await getDefaultHttpService().request({ url: testUrl, method: "GET" });

		expect(result.response?.payload).toStrictEqual(json);
	});
});
