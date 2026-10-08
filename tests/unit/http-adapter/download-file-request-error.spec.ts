import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { KnownHeaderName } from "../../../lib/models/core.models.js";
import type { ErrorReason, ErrorResponseData } from "../../../lib/models/error.models.js";
import { stubFetchWithResponse } from "../../../lib/testkit/testkit.utils.js";

const downloadUrl = "https://domain.com/image.jpg";
const contentTypeHeaderName = "Content-Type" satisfies KnownHeaderName;

describe("Download file - Kontent JSON error response", async () => {
	const kontentErrorResponse = { message: "Asset not found.", request_id: "abc-123", error_code: 100 } satisfies ErrorResponseData;
	stubFetchWithResponse(() => Response.json(kontentErrorResponse, { status: 404 }));

	const { success, error } = await getDefaultHttpService().downloadFile({ url: downloadUrl });

	it("Should fail with 'notFound' reason", () => {
		expect(success).toBe(false);
		expect(error?.details.reason).toStrictEqual("notFound" satisfies ErrorReason);
	});

	it("Should expose the parsed Kontent error response", () => {
		if (error?.details.reason !== ("notFound" satisfies ErrorReason)) {
			throw new Error("Expected a 'notFound' error");
		}
		expect(error.details.kontentErrorResponse).toStrictEqual(kontentErrorResponse);
	});

	it("Should include the API message in the error message exactly once", () => {
		expect(error?.message.split(kontentErrorResponse.message)).toHaveLength(2);
	});

	it("Should keep the raw Blob as the adapter response payload", () => {
		if (error?.details.reason !== ("notFound" satisfies ErrorReason)) {
			throw new Error("Expected a 'notFound' error");
		}
		expect(error.details.adapterResponse.payload).toBeInstanceOf(Blob);
	});
});

describe("Download file - non-JSON error response", async () => {
	stubFetchWithResponse(() => new Response("Internal error", { status: 500, headers: { [contentTypeHeaderName]: "text/plain" } }));

	const { error } = await getDefaultHttpService().downloadFile({ url: downloadUrl });

	it("Should fail with 'invalidResponse' reason and no Kontent error response", () => {
		if (error?.details.reason !== ("invalidResponse" satisfies ErrorReason)) {
			throw new Error("Expected an 'invalidResponse' error");
		}
		expect(error.details.kontentErrorResponse).toBeUndefined();
	});
});

describe("Download file - JSON content type with invalid JSON body", async () => {
	stubFetchWithResponse(() => new Response("{not json", { status: 400, headers: { [contentTypeHeaderName]: "application/json" } }));

	const { error } = await getDefaultHttpService().downloadFile({ url: downloadUrl });

	it("Should fail with 'invalidResponse' reason and no Kontent error response", () => {
		if (error?.details.reason !== ("invalidResponse" satisfies ErrorReason)) {
			throw new Error("Expected an 'invalidResponse' error");
		}
		expect(error.details.kontentErrorResponse).toBeUndefined();
	});
});
