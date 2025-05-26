import { afterAll, describe, expect, it, vi } from 'vitest';
import { getFakeBlob, getFetchBlobMock } from '../../lib/devkit/test.utils.js';
import type { HttpServiceStatus } from '../../lib/http/http.models.js';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import type { HttpMethod } from '../../lib/models/core.models.js';

const fakeBlob = getFakeBlob();

describe('Upload file - Success', async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchBlobMock({
		blob: fakeBlob,
		status: 200,
	});

	const response = await getDefaultHttpService({
		retryStrategy: {
			maxAttempts: 0,
		},
	}).uploadFileAsync<{
		readonly id: string;
	}>({
		url: 'https://domain.com',
		body: fakeBlob,
		method: 'POST',
		requestHeaders: [
			{
				name: 'Content-type',
				value: fakeBlob.type,
			},
		],
	});

	it('Status should be 200', () => {
		expect(response.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it('Method should be POST', () => {
		expect(response.method).toStrictEqual<HttpMethod>('POST');
	});
});
