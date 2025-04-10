import { afterAll, describe, expect, it, vi } from 'vitest';
import { defaultHttpService } from '../../lib/public_api.js';
import { sdkInfo } from '../../lib/sdk.generated.js';
import { getSdkIdHeader } from '../../lib/utils/header.utils.js';
import { getFetchMock } from '../_utils/test.utils.js';

const sdkIdHeader = getSdkIdHeader(sdkInfo);

describe('Default headers', async () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    global.fetch = getFetchMock({
        json: {},
        status: 200,
        headers: [{ name: 'Content-Type', value: 'application/json' }]
    });

    const response = await defaultHttpService.getAsync(`https://domain.com`);

    it('Response should contain application/json content type header', () => {
        expect(response.responseHeaders.find((m) => m.name.toLowerCase() === 'content-type')?.value).toStrictEqual(
            'application/json'
        );
    });

    it(`Request should contain '${sdkIdHeader.name}' header`, () => {
        expect(response.requestHeaders.find((m) => m.name === 'X-KC-SDKID')?.value).toStrictEqual(sdkIdHeader.value);
    });
});

describe(`Custom '${sdkIdHeader.name}' header`, async () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    const customSdkId = 'x';

    global.fetch = getFetchMock({
        json: {},
        status: 200
    });

    const response = await defaultHttpService.getAsync(`https://domain.com`, {
        requestHeaders: [{ name: 'X-KC-SDKID', value: customSdkId }]
    });

    it(`Request should contain only single '${sdkIdHeader.name}' header`, () => {
        expect(response.requestHeaders.filter((m) => m.name === 'X-KC-SDKID').length).toStrictEqual(1);
    });

    it(`Request should contain '${sdkIdHeader.name}' header`, () => {
        expect(response.requestHeaders.find((m) => m.name === 'X-KC-SDKID')?.value).toStrictEqual(customSdkId);
    });
});
