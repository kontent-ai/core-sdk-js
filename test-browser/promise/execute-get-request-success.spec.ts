import { AxiosResponse } from 'axios';
import { HttpService, httpDebugger, IResponse } from '../../lib';

describe('Execute get request - success', async () => {
    const httpService = new HttpService();
    let response: IResponse<any>;

    beforeAll(async () => {
        spyOn(httpDebugger, 'debugStartHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugSuccessHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugRetryHttpRequest').and.callThrough();

        response = await httpService.getAsync({
            url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior'
        });
    });

    it(`Request should not succeed and retry should be called`, () => {
        expect(httpDebugger.debugSuccessHttpRequest).toHaveBeenCalledTimes(1);
        expect(httpDebugger.debugStartHttpRequest).toHaveBeenCalledTimes(1);
        expect(httpDebugger.debugRetryHttpRequest).toHaveBeenCalledTimes(0);
    });

    it(`Request reseponse data should be correct`, () => {
        expect(response.status).toEqual(200);
        expect(response.headers).toEqual(jasmine.any(Array));
        expect(response.headers.length).toBeGreaterThan(0);
        expect(response.data).toBeDefined();
        expect(response.data.item).toBeDefined();

        expect((<AxiosResponse>response.rawResponse).config.method).toEqual('get');
    });

    it(`X-Stale-Content is set to 0 in browser context`, () => {
        const staleContentHeader = response.headers.find(
            (m) => m.header.toLowerCase() === 'x-stale-content'.toLowerCase()
        );
        expect(staleContentHeader?.value).toEqual('0');
    });
});
