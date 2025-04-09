import type { Mock } from 'vitest';
import { vi } from 'vitest';
import type { HttpServiceStatus } from '../../lib/http/http.models.js';
import type { Header } from '../../lib/public_api.js';
import { toFetchHeaders } from '../../lib/utils/header.utils.js';

export function getFetchMock<TResponseData = unknown>({
    json,
    status,
    headers
}: {
    readonly json: TResponseData;
    readonly status: HttpServiceStatus;
    readonly headers?: Header[];
}): Mock<() => Promise<Response>> {
    return vi.fn(() => {
        return Promise.resolve({
            ...({} as Response),
            json: () => Promise.resolve(json),
            ok: status === 200,
            headers: toFetchHeaders(headers ?? []),
            status
        });
    });
}
