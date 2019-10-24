import { HttpService, retryService } from '../../lib';
import { AxiosError } from 'axios';

describe('Retry Promise - retry after header in date format', () => {
    const retryAttempts = 1;

    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;
    const httpService = new HttpService();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll((done) => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        const retryAfterSeconds: number = 5;
        const retryAfterDate: Date = new Date();
        retryAfterDate.setSeconds(retryAfterDate.getSeconds() + retryAfterSeconds);

         // fake error
         const error: any = {
            originalError: <AxiosError>{
                response: {
                    status: 401,
                    headers: {
                        'Retry-After': retryAfterDate.toUTCString()
                    }
                },
                isAxiosError: true
            }
        };

        const promise = new Promise((resolve, reject) => {
            reject(error);
        });

        httpService.retryPromise(promise, {
            deltaBackoffMs: 100,
            maxCumulativeWaitTimeMs: 100,
            useRetryForResponseCodes: [401],
            addJitter: false
        }).then(() => {
            throw Error(`Promise should not succeed`);
        }).catch(err => {
            console.error('Error: ', err);
            done();
        });
    });

    it(`Warning for retry attempt should have been called '${retryAttempts}' times`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(retryAttempts);
    });
});

