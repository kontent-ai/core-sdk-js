import type { HttpServiceStatus } from '../../lib/http/http.models.js';

export type FetchResponse = {
    readonly statusCode: HttpServiceStatus;
    readonly json?: unknown;
};
