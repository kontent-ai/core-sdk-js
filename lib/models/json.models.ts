export type JsonValue = string | number | null | boolean | JsonObject | JsonArray | NonNullable<never>;

export interface JsonObject {
	readonly [property: string]: JsonValue;
}

export type JsonArray = readonly JsonValue[];
