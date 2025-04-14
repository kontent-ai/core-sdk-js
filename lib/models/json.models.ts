export type JsonValue = string | number | null | boolean | JsonObject | JsonArray;

export interface JsonObject {
    [x: string]: JsonValue;
}

export type JsonArray = Array<JsonValue>;
