import { afterAll, describe, expect, it, vi } from 'vitest';
import { defaultHttpService } from '../../lib/http/http.service.js';
import { getFakeBlob, getFetchBlobMock } from '../_utils/test.utils.js';

const fakeBlob = getFakeBlob();

describe('Download file - Success', async () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    global.fetch = getFetchBlobMock({
        blob: fakeBlob,
        status: 200
    });

    const response = await defaultHttpService.downloadFileAsync({
        url: `https://domain.com/image.jpg`,
        options: {}
    });

    it('Status should be 200', () => {
        expect(response.status).toStrictEqual(200);
    });

    it('Blob should be set', () => {
        expect(response.data).toBeInstanceOf(Blob);
    });

    it('Method should be GET', () => {
        expect(response.method).toStrictEqual('GET');
    });

    it('Blob should be the same as the fake blob', () => {
        expect(response.data).toStrictEqual(fakeBlob);
    });
});
