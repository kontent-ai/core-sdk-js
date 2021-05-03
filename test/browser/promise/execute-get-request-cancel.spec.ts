import { HttpService, httpDebugger } from '../../../lib';

describe('Execute get request - cancel', () => {
    const httpService = new HttpService();
    const cancelToken = httpService.createCancelToken();
    const cancelMessage: string = 'Manual test cancel';

    let error: any;

    beforeAll((done) => {
        spyOn(httpDebugger, 'debugStartHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugSuccessHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugRetryHttpRequest').and.callThrough();

        // do not use await as that would prevent us from cancelling request on the fly
        httpService
            .getAsync(
                {
                    url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior-invalid'
                },
                {
                    cancelToken: cancelToken,
                    retryStrategy: {
                        maxAttempts: 3,
                        addJitter: false,
                        canRetryError: (err) => true,
                        deltaBackoffMs: 100
                    }
                }
            )
            .catch((err) => {
                error = err;
                done();
            });

            // cancel request right away
            cancelToken.cancel(cancelMessage);
    });

    it(`Request should be of type 'Cancel' and error should contain cancel message`, () => {
        expect(error.message).toContain(cancelMessage);
    });

    it(`Request should not be retried if it's cancelled`, () => {
        expect(httpDebugger.debugSuccessHttpRequest).toHaveBeenCalledTimes(0);
        expect(httpDebugger.debugStartHttpRequest).toHaveBeenCalledTimes(1);
        expect(httpDebugger.debugRetryHttpRequest).toHaveBeenCalledTimes(0);
    });
});
