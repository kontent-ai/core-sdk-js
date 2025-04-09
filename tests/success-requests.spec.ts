import { afterAll, describe, expect, it, vi } from 'vitest';
import { defaultHttpService } from '../lib/http/http.service.js';
import { sdkInfo } from '../lib/sdk.generated.js';
import { getSdkIdHeader } from '../lib/utils/header.utils.js';
import { getFetchMock } from './_utils/test.utils.js';

type ResponseData = {
    readonly codename: string;
};

const data: ResponseData = {
    codename: 'x'
};

const sdkIdHeader = getSdkIdHeader(sdkInfo);

describe('Success requests', async () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    global.fetch = getFetchMock<ResponseData>({
        json: data,
        status: 200,
        headers: [{ name: 'Content-Type', value: 'application/json' }]
    });

    const response = await defaultHttpService.getAsync<ResponseData>(`https://domain.com`);

    it('Status should be 200', () => {
        expect(response.status).toStrictEqual(200);
    });

    it(`Post id should be ${data.codename}`, () => {
        expect(response.data.codename).toStrictEqual(data.codename);
        expect(response.data).toStrictEqual(data);
    });

    it('Response should contain headers', () => {
        expect(response.responseHeaders.length).toBeGreaterThan(0);
    });

    it('Response should contain application/json content type header', () => {
        expect(response.responseHeaders.find((m) => m.name.toLowerCase() === 'content-type')?.value).toStrictEqual(
            'application/json'
        );
    });

    it(`Response should contain '${sdkIdHeader.name}' header`, () => {
        expect(response.requestHeaders.find((m) => m.name === 'X-KC-SDKID')?.value).toStrictEqual(sdkIdHeader.value);
    });
});
