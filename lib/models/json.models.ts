import type { EmptyObject } from "./utility.models.js";

export type JsonValue = string | number | null | boolean | JsonObject | JsonArray | EmptyObject;

export interface JsonObject {
	readonly [property: string]: JsonValue;
}

export type JsonArray = readonly JsonValue[];
