import { describe, expect, it } from "vitest";
import { codenameOf, codenameOfWithStringFallback, codenameSchema } from "../../../lib/sdk/sdk-config.js";

describe("getCodenameSchema", () => {
	it("Should validate against provided codenames when provided", () => {
		const schema = codenameOf(["article", "product"] as const);

		const validArticle = schema.safeParse("article");
		const validProduct = schema.safeParse("product");
		const invalidOther = schema.safeParse("other");

		expect(validArticle.success).toBe(true);
		expect(validProduct.success).toBe(true);
		expect(invalidOther.success).toBe(false);
	});

	it("Should validate against codename-like string when codenames are not provided", () => {
		const schema = codenameOf(undefined);

		const validString = schema.safeParse("any_codename");
		const invalidNonString = schema.safeParse(123);

		expect(validString.success).toBe(true);
		expect(invalidNonString.success).toBe(false);
	});
});

describe("codenameOfWithStringFallback", () => {
	it("Should validate against provided codenames when provided", () => {
		const schema = codenameOfWithStringFallback(["article", "product"] as const);

		expect(schema.safeParse("article").success).toBe(true);
		expect(schema.safeParse("product").success).toBe(true);
		expect(schema.safeParse("other").success).toBe(false);
	});

	it("Should accept any string including invalid codename format when codenames are not provided", () => {
		const schema = codenameOfWithStringFallback(undefined);

		expect(schema.safeParse("any-codename").success).toBe(true);
	});
});

describe("codenameSchema", () => {
	it("Should accept a simple lowercase word", () => {
		expect(codenameSchema.safeParse("article").success).toBe(true);
	});

	it("Should accept a codename with underscores", () => {
		expect(codenameSchema.safeParse("my_content_type").success).toBe(true);
	});

	it("Should accept a codename with an underscore separator", () => {
		expect(codenameSchema.safeParse("hero_image").success).toBe(true);
	});

	it("Should accept a codename ending with a digit", () => {
		expect(codenameSchema.safeParse("article2").success).toBe(true);
	});

	it("Should accept a single lowercase letter", () => {
		expect(codenameSchema.safeParse("a").success).toBe(true);
	});

	it("Should accept a codename with mixed letters, underscores, and digits", () => {
		expect(codenameSchema.safeParse("abc_123_def").success).toBe(true);
	});

	it("Should reject an empty string", () => {
		expect(codenameSchema.safeParse("").success).toBe(false);
	});

	it("Should reject a codename starting with an uppercase letter", () => {
		expect(codenameSchema.safeParse("Article").success).toBe(false);
	});

	it("Should reject an all-uppercase codename", () => {
		expect(codenameSchema.safeParse("MY_TYPE").success).toBe(false);
	});

	it("Should reject a codename containing a hyphen", () => {
		expect(codenameSchema.safeParse("my-content-type").success).toBe(false);
	});

	it("Should reject a codename starting with a digit", () => {
		expect(codenameSchema.safeParse("123article").success).toBe(false);
	});

	it("Should reject a codename starting with an underscore", () => {
		expect(codenameSchema.safeParse("_article").success).toBe(false);
	});

	it("Should reject a codename containing a space", () => {
		expect(codenameSchema.safeParse("my content").success).toBe(false);
	});

	it("Should reject a codename containing a dot", () => {
		expect(codenameSchema.safeParse("my.type").success).toBe(false);
	});
});
