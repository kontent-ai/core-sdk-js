import { describe, expect, it } from "vitest";
import { getCodenameSchema } from "../../../lib/utils/type.utils.js";

describe("getCodenameSchema", () => {
	it("Validates against provided codenames when provided", () => {
		const schema = getCodenameSchema(["article", "product"] as const);

		const validArticle = schema.safeParse("article");
		const validProduct = schema.safeParse("product");
		const invalidOther = schema.safeParse("other");

		expect(validArticle.success).toBe(true);
		expect(validProduct.success).toBe(true);
		expect(invalidOther.success).toBe(false);
	});

	it("Validates against any string when codenames are not provided", () => {
		const schema = getCodenameSchema(undefined);

		const validString = schema.safeParse("any-codename");
		const invalidNonString = schema.safeParse(123 as unknown);

		expect(validString.success).toBe(true);
		expect(invalidNonString.success).toBe(false);
	});

	it("Validates against any string when codenames array is empty", () => {
		// empty array should behave the same as undefined and fall back to string schema
		const schema = getCodenameSchema([] as const);

		const validString = schema.safeParse("any-codename");
		const invalidNonString = schema.safeParse({} as unknown);

		expect(validString.success).toBe(true);
		expect(invalidNonString.success).toBe(false);
	});
});
