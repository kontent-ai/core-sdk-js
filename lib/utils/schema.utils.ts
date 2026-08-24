import type { $ZodType } from "zod/v4/core";

export type SchemaInput<T> = (() => Promise<$ZodType<T>>) | $ZodType<T> | undefined;

export async function resolveSchema<T>(input: SchemaInput<T>): Promise<$ZodType<T> | undefined> {
	if (input === undefined) {
		return undefined;
	}
	if (typeof input === "function") {
		return await input();
	}
	return input;
}
