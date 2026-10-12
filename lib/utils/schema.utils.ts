import type * as z from "@zod/mini";

export type SchemaInput<T> = (() => Promise<z.core.$ZodType<T>>) | z.core.$ZodType<T> | undefined;

export async function resolveSchema<T>(input: SchemaInput<T>): Promise<z.core.$ZodType<T> | undefined> {
	if (input === undefined) {
		return undefined;
	}
	if (typeof input === "function") {
		return await input();
	}
	return input;
}
