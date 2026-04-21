import type { HttpStatusCode } from "../http/http.models.js";
import type { JsonValue } from "../models/json.models.js";

export type FetchResponse = {
	readonly statusCode: HttpStatusCode;
	readonly json: JsonValue;
};
