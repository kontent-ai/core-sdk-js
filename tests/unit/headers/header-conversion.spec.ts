import { describe, expect, it } from "vitest";
import type { Header } from "../../../lib/models/core.models.js";
import { toFetchHeaders, toSdkHeaders } from "../../../lib/utils/header.utils.js";

describe("toSdkHeaders", () => {
	it("Should convert empty Headers to empty array", () => {
		const headers = new Headers();
		expect(toSdkHeaders(headers)).toStrictEqual([]);
	});

	it("Should convert single header to single Header object", () => {
		const headers = new Headers([["Content-Type", "application/json"]]);
		expect(toSdkHeaders(headers)).toStrictEqual([
			{
				name: "content-type",
				value: "application/json",
			},
		]);
	});

	it("Should convert multiple headers to Header array", () => {
		const headers = new Headers([
			["Content-Type", "application/json"],
			["X-KC-SDKID", "host;name;1.0.0"],
			["Retry-After", "5"],
		]);
		const result = toSdkHeaders(headers);
		expect(result).toHaveLength(3);
		expect(result).toContainEqual({ name: "content-type", value: "application/json" });
		expect(result).toContainEqual({ name: "x-kc-sdkid", value: "host;name;1.0.0" });
		expect(result).toContainEqual({ name: "retry-after", value: "5" });
	});

	it("Should convert normalized header names from Headers API (lowercase)", () => {
		const headers = new Headers([["X-Custom-Header", "custom-value"]]);
		expect(toSdkHeaders(headers)).toStrictEqual([{ name: "x-custom-header", value: "custom-value" }]);
	});
});

describe("toFetchHeaders", () => {
	it("Should convert empty Header array to empty Headers", () => {
		const headers: readonly Header[] = [];
		const result = toFetchHeaders(headers);
		expect(toSdkHeaders(result)).toStrictEqual([]);
	});

	it("Should convert single Header to Headers with one entry", () => {
		const headers: readonly Header[] = [{ name: "Content-Type", value: "application/json" }];
		const result = toFetchHeaders(headers);
		expect(toSdkHeaders(result)).toStrictEqual([{ name: "content-type", value: "application/json" }]);
	});

	it("Should convert multiple Headers to Headers", () => {
		const headers: readonly Header[] = [
			{ name: "Content-Type", value: "application/json" },
			{ name: "X-KC-SDKID", value: "host;name;1.0.0" },
			{ name: "Retry-After", value: "5" },
		];
		const result = toFetchHeaders(headers);
		const back = toSdkHeaders(result);
		expect(back).toHaveLength(3);
		expect(back).toContainEqual({ name: "content-type", value: "application/json" });
		expect(back).toContainEqual({ name: "x-kc-sdkid", value: "host;name;1.0.0" });
		expect(back).toContainEqual({ name: "retry-after", value: "5" });
	});

	it("Should preserve header names and values (normalized to lowercase by Headers API)", () => {
		const headers: readonly Header[] = [{ name: "X-Custom-Header", value: "custom-value" }];
		const result = toFetchHeaders(headers);
		expect(toSdkHeaders(result)).toStrictEqual([{ name: "x-custom-header", value: "custom-value" }]);
	});
});
