import type { HttpServiceStatus, JsonValue } from '../public_api.js';

export type FetchResponse = {
	readonly statusCode: HttpServiceStatus;
	readonly json: JsonValue;
};
