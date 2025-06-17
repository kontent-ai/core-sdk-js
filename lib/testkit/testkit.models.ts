import type { HttpServiceStatus } from "../http/http.models.js";
import type { JsonValue } from "../models/json.models.js";

export type FetchResponse = {
	readonly statusCode: HttpServiceStatus;
	readonly json: JsonValue;
};
