import { afterAll, describe, expect, it, vi } from 'vitest';
import { defaultHttpService } from '../lib/http/http.service.js';
import { getFetchMock } from './_utils/test.utils.js';

type ResponseData = {
    readonly codename: string;
};

const data: ResponseData = {
    codename: 'x'
};

describe('Success requests', async () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    global.fetch = getFetchMock<ResponseData>({
        json: data,
        status: 200
    });

    const response = await defaultHttpService.getAsync<ResponseData>(`https://domain.com`);

    it('Status should be 200', () => {
        expect(response.status).toStrictEqual(200);
    });

    it(`Post id should be ${data.codename}`, () => {
        expect(response.data.codename).toStrictEqual(data.codename);
        expect(response.data).toStrictEqual(data);
    });
});
