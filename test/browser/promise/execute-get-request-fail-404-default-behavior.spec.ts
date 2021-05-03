import { HttpService, httpDebugger } from '../../../lib';

describe('Execute get request - fail & default behavior for 404', () => {
    const httpService = new HttpService();
    let error: any;
    const retryAttempts: number = 0; // 404 should not be retried by default

    beforeAll(async () => {
        spyOn(httpDebugger, 'debugStartHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugSuccessHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugRetryHttpRequest').and.callThrough();

        try {
            await httpService.getAsync(
                {
                    url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior-invalid'
                }
                // do not specify strategy => leave it to default configuration
            );
        } catch (err) {
            error = err;
        }
    });

    it(`Error should preserve error message`, () => {
        expect(error.toString()).toContain('Request failed with status code 404');
    });

    it(`Debug methods should be called proper number of times`, () => {
        expect(httpDebugger.debugSuccessHttpRequest).toHaveBeenCalledTimes(0);
        expect(httpDebugger.debugStartHttpRequest).toHaveBeenCalledTimes(retryAttempts + 1);
        expect(httpDebugger.debugRetryHttpRequest).toHaveBeenCalledTimes(retryAttempts);
    });
});
