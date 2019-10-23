import { HttpService, retryService } from '../../lib';
import { AxiosError } from 'axios';

describe('Retry Promise - isolated - retry', () => {
    const retryAttempts = 3;

    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;
    const httpService = new HttpService();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll((done) => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        const promise = httpService.get({
            mapError: (err => {
                const error: any = {
                    originalError: <AxiosError>{
                        response: {
                            status: 401
                        },
                        isAxiosError: true
                    }
                };
                return error;
            }),
            url: 'http://localhost/fail'
        }).toPromise();

        httpService.retryPromise(promise, {
            deltaBackoffMs: 1000,
            maxCumulativeWaitTimeMs: 10000,
            useRetryForResponseCodes: [500]
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

