export type JsonValue = string | number | null | boolean | JsonObject | JsonArray;

export type JsonObject = {
	readonly [property: string]: JsonValue | undefined;
};

export type JsonArray = readonly JsonValue[];
