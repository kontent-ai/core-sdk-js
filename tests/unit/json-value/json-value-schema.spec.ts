import { describe, expect, it } from "vitest";
import { jsonValueSchema } from "../../../lib/models/json.models.js";

describe("JsonValue schema", () => {
	it("Parsing number value should succeed", () => {
		const result = jsonValueSchema.safeParse(123);
		expect(result.success).toBe(true);
	});

	it("Parsing string value should succeed", () => {
		const result = jsonValueSchema.safeParse("Hello, world!");
		expect(result.success).toBe(true);
	});

	it("Parsing boolean value should succeed", () => {
		const result = jsonValueSchema.safeParse(true);
		expect(result.success).toBe(true);
	});

	it("Parsing null value should succeed", () => {
		const result = jsonValueSchema.safeParse(null);
		expect(result.success).toBe(true);
	});

	it("Parsing object value should succeed", () => {
		const result = jsonValueSchema.safeParse({ name: "John", age: 30 });
		expect(result.success).toBe(true);
	});

	it("Parsing array value should succeed", () => {
		const result = jsonValueSchema.safeParse(["John", "Jane", "Jim"]);
		expect(result.success).toBe(true);
	});

	it("Parsing invalid value should fail (undefined)", () => {
		const result = jsonValueSchema.safeParse(undefined);
		expect(result.success).toBe(false);
	});

	it("Parsing invalid value should fail (Error)", () => {
		const result = jsonValueSchema.safeParse(new Error("Invalid value"));
		expect(result.success).toBe(false);
	});

	it("Parsing invalid value should fail (Date)", () => {
		const result = jsonValueSchema.safeParse(new Date());
		expect(result.success).toBe(false);
	});

	it("Parsing invalid value should fail (Function)", () => {
		const result = jsonValueSchema.safeParse(() => {});
		expect(result.success).toBe(false);
	});

	it("Parsing invalid value should fail if array contains an invalid value", () => {
		const result = jsonValueSchema.safeParse(["John", "Jane", new Date()]);
		expect(result.success).toBe(false);
	});
});
