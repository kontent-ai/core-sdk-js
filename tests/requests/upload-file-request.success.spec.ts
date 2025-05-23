import { afterAll, describe, expect, it, vi } from 'vitest';
import { getFakeBlob, getFetchBlobMock } from '../../lib/devkit/test.utils.js';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import type { HttpMethod, HttpServiceStatus } from '../../lib/public_api.js';

const fakeBlob = getFakeBlob();

describe('Upload file - Success', async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchBlobMock({
		blob: fakeBlob,
		status: 200,
	});

	const response = await getDefaultHttpService().uploadFileAsync<{
		readonly id: string;
	}>({
		url: 'https://domain.com',
		file: fakeBlob,
		method: 'POST',
		options: {
			retryStrategy: {
				maxAttempts: 0,
			},
			requestHeaders: [
				{
					name: 'Content-type',
					value: fakeBlob.type,
				},
			],
		},
	});

	it('Status should be 200', () => {
		expect(response.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it('Method should be POST', () => {
		expect(response.method).toStrictEqual<HttpMethod>('POST');
	});
});
