import type { Header } from '../models/core.models.js';
import type { HttpService, HttpServiceStatus } from './http.models.js';

export function getHttpServiceWithResponse(response: {
    readonly data?: unknown;
    readonly status?: HttpServiceStatus;
    readonly responseHeaders?: Header[];
}): HttpService {
    return {
        getAsync: async <TResponseData>() => {
            return {
                data: (await Promise.resolve(response.data)) as TResponseData,
                responseHeaders: response.responseHeaders ?? [],
                status: response.status ?? 200
            };
        }
    };
}
