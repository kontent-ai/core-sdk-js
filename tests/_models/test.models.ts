import type { HttpServiceStatus } from '../../lib/http/http.models.js';
import type { JsonValue } from '../../lib/models/json.models.js';

export type FetchResponse = {
	readonly statusCode: HttpServiceStatus;
	readonly json: JsonValue;
};
