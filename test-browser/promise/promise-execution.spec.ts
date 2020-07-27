import { HttpService, httpDebugger, IBaseResponse } from '../../lib';

describe('Promise execution', () => {

    const httpService = new HttpService();
    let response: IBaseResponse<any>;

    beforeAll((done) => {
        spyOn(httpDebugger, 'debugStartHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugResolveHttpRequest').and.callThrough();

        httpService.get({
            url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior'
        })
        .subscribe(result => {
            response = result;
            done();
        });

    });

    it(`Promise should succeed response should be present`, () => {
        expect(httpDebugger.debugResolveHttpRequest).toHaveBeenCalledTimes(1);
        expect(httpDebugger.debugStartHttpRequest).toHaveBeenCalledTimes(1);

        expect(response.data).toBeDefined();
        expect(response.data.item).toBeDefined();
    });

    it(`Response status and headers should be set`, () => {
        expect(response.status).toEqual(200);
        expect(response.headers).toEqual(jasmine.any(Array));
        expect(response.headers.length).toBeGreaterThan(0);
    });

    it(`X-Stale-Content is set to 0 in browser context`, () => {
        const staleContentHeader = response.headers.find(m => m.header.toLowerCase() === 'x-stale-content'.toLowerCase());
        expect(staleContentHeader?.value).toEqual('0');
    });
});

