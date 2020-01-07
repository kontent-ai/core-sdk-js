import { of, throwError } from 'rxjs';
import { catchError, retryWhen, switchMap } from 'rxjs/operators';

import { retryService, observableRetryStrategy } from '../../lib';
import { AxiosError } from 'axios';

describe('Retry Rxjs - isolated - retry', () => {
    const expectedRetryAttempts = 2;
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll((done) => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        // fake error
        const error: any = {
            originalError: <AxiosError>{
                response: {
                    status: 429,
                    headers: {}
                },
                isAxiosError: true
            }
        };

        of(true)
            .pipe(
                switchMap(() => {
                    return throwError(error);
                }),
                retryWhen(observableRetryStrategy.strategy({
                    deltaBackoffMs: 100,
                    maxCumulativeWaitTimeMs: 300,
                    addJitter: false,
                    maxAttempts: 100,
                    canRetryError: (xError) => retryService.canRetryErrorDefault(xError),
                }, {
                    startTime: new Date()
                })),
                catchError((err, t) => {
                    return of(true);
                }),
            )
            .subscribe(() => done());

    });

    it(`Warning for retry attempt should have been called '${expectedRetryAttempts}' times`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(expectedRetryAttempts);
    });
});

