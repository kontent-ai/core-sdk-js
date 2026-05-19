import { describe, expect, it } from "vitest";
import { createBatchTransformResponses } from "../../../../lib/sdk/transform/transform-utils.js";

describe("createBatchTransformResponses - returns empty data when given no responses", async () => {
	let transformCalled = false;
	const batch = createBatchTransformResponses({
		config: { runtimeValidation: { validateResponses: false } },
		transform: (responses) => {
			transformCalled = true;
			return responses;
		},
		transformSchema: () => {
			throw new Error("schema should not be loaded for empty input");
		},
		mapError: (error) => error,
	});

	const result = await batch([]);

	it("Should return success", () => {
		expect(result.success).toBe(true);
	});

	it("Should return empty data array", () => {
		expect(result.data).toStrictEqual([]);
	});

	it("Should short-circuit without invoking transform", () => {
		expect(transformCalled).toBe(false);
	});
});
