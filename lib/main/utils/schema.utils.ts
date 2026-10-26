import type { StandardSchemaV1 } from "@standard-schema/spec";

export type SchemaInput<T> = (() => Promise<StandardSchemaV1<unknown, T>>) | StandardSchemaV1<unknown, T> | undefined;

export async function resolveSchema<T>(input: SchemaInput<T>): Promise<StandardSchemaV1<unknown, T> | undefined> {
	if (input === undefined) {
		return undefined;
	}
	if (typeof input === "function") {
		return await input();
	}
	return input;
}
