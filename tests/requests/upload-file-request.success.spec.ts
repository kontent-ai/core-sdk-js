import { afterAll, describe, expect, it, vi } from 'vitest';
import { defaultHttpService } from '../../lib/http/http.service.js';
import type { HttpMethod, HttpServiceStatus } from '../../lib/public_api.js';
import { getFakeBlob, getFetchBlobMock } from '../_utils/test.utils.js';

const fakeBlob = getFakeBlob();

describe('Upload file - Success', async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchBlobMock({
		blob: fakeBlob,
		status: 200,
	});

	const response = await defaultHttpService.uploadFileAsync<{
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
