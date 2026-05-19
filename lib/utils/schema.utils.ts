import type { ZodMiniType } from "zod/mini";

export type SchemaInput<T> = (() => Promise<ZodMiniType<T>>) | ZodMiniType<T> | undefined;

export async function resolveSchema<T>(input: SchemaInput<T>): Promise<ZodMiniType<T> | undefined> {
	if (input === undefined) {
		return undefined;
	}
	if (typeof input === "function") {
		return await input();
	}
	return input;
}
