import { HttpService, httpDebugger } from '../../lib';

describe('Execute get request', () => {
    const httpService = new HttpService();
    let error: any;

    beforeAll(async () => {
        spyOn(httpDebugger, 'debugStartHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugSuccessHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugRetryHttpRequest').and.callThrough();

        try {
            await httpService.getAsync(
                {
                    url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior-invalid'
                },
                {
                    retryStrategy: {
                        maxAttempts: 3,
                        addJitter: false,
                        canRetryError: (err) => true,
                        deltaBackoffMs: 100
                    }
                }
            );
        } catch (err) {
            error = err;
        }
    });

    it(`Error should preserve error message`, () => {
        expect(error.toString()).toContain('Request failed with status code 404');
    });

    it(`Request should success and debug methods called`, () => {
        expect(httpDebugger.debugSuccessHttpRequest).toHaveBeenCalledTimes(0);
        expect(httpDebugger.debugStartHttpRequest).toHaveBeenCalledTimes(4);
        expect(httpDebugger.debugRetryHttpRequest).toHaveBeenCalledTimes(3);
    });
});
