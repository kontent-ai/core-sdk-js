export type JsonValue = string | number | null | boolean | JsonObject | JsonArray;

export interface JsonObject {
    readonly [property: string]: JsonValue;
}

export type JsonArray = readonly JsonValue[];
