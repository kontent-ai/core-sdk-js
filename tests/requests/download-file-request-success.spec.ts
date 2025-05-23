import { afterAll, describe, expect, it, vi } from 'vitest';
import { getFakeBlob, getFetchBlobMock } from '../../lib/devkit/test.utils.js';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import type { HttpMethod, HttpServiceStatus } from '../../lib/public_api.js';

const fakeBlob = getFakeBlob();

describe('Download file - Success', async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchBlobMock({
		blob: fakeBlob,
		status: 200,
	});

	const response = await getDefaultHttpService().downloadFileAsync({
		url: 'https://domain.com/image.jpg',
		options: {},
	});

	it('Status should be 200', () => {
		expect(response.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it('Method should be GET', () => {
		expect(response.method).toStrictEqual<HttpMethod>('GET');
	});

	it('Blob should be the same as the fake blob', () => {
		expect(response.data).toBeInstanceOf(Blob);
		expect(response.data).toStrictEqual(fakeBlob);
	});
});
