import { describe, expect, it } from "vitest";
import { codenameOf, strictCodenameSchema } from "../../../lib/sdk/sdk-config.js";

describe("codenameOf", () => {
	it("Should accept any string regardless of the type hint", () => {
		const schema = codenameOf<"article" | "product">();

		expect(schema.safeParse("article").success).toBe(true);
		expect(schema.safeParse("product").success).toBe(true);
		// Type hint is compile-time only — strings outside the hint still parse.
		expect(schema.safeParse("landing_page").success).toBe(true);
		// Format is not enforced at runtime — the API contract is the source of truth.
		expect(schema.safeParse("en-US").success).toBe(true);
	});

	it("Should reject non-string values", () => {
		const schema = codenameOf();

		expect(schema.safeParse(123).success).toBe(false);
		expect(schema.safeParse(null).success).toBe(false);
		expect(schema.safeParse(undefined).success).toBe(false);
	});
});

describe("codenameSchema", () => {
	it("Should accept a simple lowercase word", () => {
		expect(strictCodenameSchema.safeParse("article").success).toBe(true);
	});

	it("Should accept a codename with underscores", () => {
		expect(strictCodenameSchema.safeParse("my_content_type").success).toBe(true);
	});

	it("Should accept a codename with an underscore separator", () => {
		expect(strictCodenameSchema.safeParse("hero_image").success).toBe(true);
	});

	it("Should accept a codename ending with a digit", () => {
		expect(strictCodenameSchema.safeParse("article2").success).toBe(true);
	});

	it("Should accept a single lowercase letter", () => {
		expect(strictCodenameSchema.safeParse("a").success).toBe(true);
	});

	it("Should accept a codename with mixed letters, underscores, and digits", () => {
		expect(strictCodenameSchema.safeParse("abc_123_def").success).toBe(true);
	});

	it("Should reject an empty string", () => {
		expect(strictCodenameSchema.safeParse("").success).toBe(false);
	});

	it("Should reject a codename starting with an uppercase letter", () => {
		expect(strictCodenameSchema.safeParse("Article").success).toBe(false);
	});

	it("Should reject an all-uppercase codename", () => {
		expect(strictCodenameSchema.safeParse("MY_TYPE").success).toBe(false);
	});

	it("Should reject a codename containing a hyphen", () => {
		expect(strictCodenameSchema.safeParse("my-content-type").success).toBe(false);
	});

	it("Should reject a codename starting with a digit", () => {
		expect(strictCodenameSchema.safeParse("123article").success).toBe(false);
	});

	it("Should reject a codename starting with an underscore", () => {
		expect(strictCodenameSchema.safeParse("_article").success).toBe(false);
	});

	it("Should reject a codename containing a space", () => {
		expect(strictCodenameSchema.safeParse("my content").success).toBe(false);
	});

	it("Should reject a codename containing a dot", () => {
		expect(strictCodenameSchema.safeParse("my.type").success).toBe(false);
	});
});
