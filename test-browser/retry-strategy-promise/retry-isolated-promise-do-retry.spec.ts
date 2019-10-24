import { HttpService, retryService } from '../../lib';
import { AxiosError } from 'axios';

describe('Retry Promise - isolated - retry', () => {
    const retryAttempts = 2;

    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;
    const httpService = new HttpService();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll((done) => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

         // fake error
         const error: any = {
            originalError: <AxiosError>{
                response: {
                    status: 401
                },
                isAxiosError: true
            }
        };

        const promise = new Promise((resolve, reject) => {
            reject(error);
        });

        httpService.retryPromise(promise, {
            deltaBackoffMs: 1000,
            maxCumulativeWaitTimeMs: 3000,
            useRetryForResponseCodes: [401]
        }).then(() => {
            throw Error(`Promise should not succeed`);
        }).catch(err => {
            console.error('Error: ', err);
            done();
        });
    });

    it(`Warning for retry attempt should have been called '${retryAttempts}'`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(retryAttempts);
    });
});

