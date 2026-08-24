import { describe, expect, it } from "vitest";
import * as z from "zod";
import * as zMini from "zod/mini";
import { resolveSchema } from "../../../lib/utils/schema.utils.js";

describe("resolveSchema - returns undefined when input is undefined", async () => {
	const resolved = await resolveSchema(undefined);

	it("Should return undefined", () => {
		expect(resolved).toBeUndefined();
	});
});

describe("resolveSchema - returns the schema unchanged when given a schema directly", async () => {
	const schema = z.object({ name: z.string() }).readonly();
	const resolved = await resolveSchema(schema);

	it("Should return the same schema reference", () => {
		expect(resolved).toBe(schema);
	});
});

describe("resolveSchema - awaits the loader function and returns the schema", async () => {
	const schema = z.object({ name: z.string() }).readonly();
	const resolved = await resolveSchema(async () => schema);

	it("Should return the schema returned by the loader", () => {
		expect(resolved).toBe(schema);
	});
});

describe("resolveSchema - also accepts a zod/mini schema", async () => {
	const schema = zMini.readonly(zMini.object({ name: zMini.string() }));
	const resolved = await resolveSchema(schema);

	it("Should return the same schema reference", () => {
		expect(resolved).toBe(schema);
	});
});
