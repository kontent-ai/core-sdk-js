import { HttpService, retryService } from '../../lib';

describe('Retry Promise - handle error in retry functionality', () => {
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;
    const httpService = new HttpService();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    let exceptionThrown = false;

    beforeAll(done => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        // fake error
        const error: any = {
            originalError: undefined
        };

        try {
            const promise = new Promise((resolve, reject) => {
                reject(error);
            });
            httpService
                .retryPromise(promise, {
                    deltaBackoffMs: 1000,
                    maxCumulativeWaitTimeMs: 0,
                    useRetryForResponseCodes: [],
                    addJitter: false
                })
                .then(() => {
                    done();
                })
                .catch(err => {
                    done();
                });
        } catch {
            exceptionThrown = true;
        }
    });

    it(`Retry should not thrown exception when original error is invalid`, () => {
        expect(exceptionThrown).toBeFalsy();
    });
});
