import { describe, expect, it } from "vitest";
import { transformResponses } from "../../../../lib/sdk/transform/transform-utils.js";

describe("transformResponses - returns empty data when given no responses", async () => {
	let transformCalled = false;

	const result = await transformResponses(
		{
			config: { runtimeValidation: { validateResponses: false } },
			transform: (responses) => {
				transformCalled = true;
				return responses;
			},
			transformSchema: () => {
				throw new Error("schema should not be loaded for empty input");
			},
			mapError: (error) => error,
		},
		[],
	);

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
