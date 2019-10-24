import { AxiosError } from 'axios';

import { HttpService, retryService } from '../../lib';

describe('Retry Promise - skipped retry codes', () => {
    const retryAttempts: number = 0;
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;
    const httpService = new HttpService();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll(done => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        // fake error
        const error: any = {
            originalError: <AxiosError>{
                response: {
                    status: 421
                },
                isAxiosError: true
            }
        };

        const promise = new Promise((resolve, reject) => {
            reject(error);
        });

        httpService
            .retryPromise(promise, {
                deltaBackoffMs: 1000,
                maxCumulativeWaitTimeMs: 10000,
                useRetryForResponseCodes: [401, 500, 420, 422]
            })
            .then(() => {
                throw Error(`Promise should not succeed`);
            })
            .catch(err => {
                console.error('Error: ', err);
                done();
            });
    });

    it(`Warning for retry attempt should have been called '${retryAttempts}'`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(0);
    });
});
