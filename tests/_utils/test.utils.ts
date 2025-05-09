import type { Mock } from 'vitest';
import { vi } from 'vitest';
import type { HttpServiceStatus } from '../../lib/http/http.models.js';
import type { JsonValue } from '../../lib/models/json.models.js';
import type { Header } from '../../lib/public_api.js';
import { toFetchHeaders } from '../../lib/utils/header.utils.js';

export function getFetchJsonMock<TResponseData extends JsonValue>({
	json,
	status,
	headers,
}: {
	readonly json: TResponseData;
	readonly status: HttpServiceStatus;
	readonly headers?: readonly Header[];
}): Mock<() => Promise<Response>> {
	return getFetchMock<JsonValue>({
		status,
		headers,
		blob: undefined,
		json,
	});
}

export function getFetchBlobMock({
	blob,
	status,
	headers,
}: {
	readonly blob: Blob;
	readonly status: HttpServiceStatus;
	readonly headers?: readonly Header[];
}): Mock<() => Promise<Response>> {
	return getFetchMock<Blob>({
		blob,
		status,
		headers,
		json: undefined,
	});
}

export function getFakeBlob(): Blob {
	return new Blob([''], { type: 'image/jpeg' });
}

function getFetchMock<TResponseData extends JsonValue | Blob>({
	json,
	blob,
	status,
	headers,
}: {
	readonly json: TResponseData extends JsonValue ? JsonValue : undefined;
	readonly blob: TResponseData extends Blob ? Blob : undefined;
	readonly status: HttpServiceStatus;
	readonly headers?: readonly Header[];
}): Mock<() => Promise<Response>> {
	return vi.fn(() => {
		return Promise.resolve<Response>({
			// only implement the methods we need, ignore the rest
			...({} as Response),
			ok: status === 200,
			headers: toFetchHeaders(headers ?? []),
			status,
			...(json
				? {
						json: async () => await Promise.resolve(json),
					}
				: {}),
			...(blob
				? {
						blob: async () => await Promise.resolve(blob),
					}
				: {}),
		});
	});
}
