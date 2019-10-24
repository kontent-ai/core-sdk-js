import { of, throwError } from 'rxjs';
import { catchError, retryWhen, switchMap } from 'rxjs/operators';

import { retryService, observableRetryStrategy } from '../../lib';
import { AxiosError } from 'axios';

describe('Retry Rxjs - isolated - do not retry', () => {
    const retryAttempts = 0;
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;

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

        of(true)
            .pipe(
                switchMap(() => {
                    return throwError(error);
                }),
                retryWhen(observableRetryStrategy.strategy({
                    deltaBackoffMs: 1000,
                    maxCumulativeWaitTimeMs: 0,
                    useRetryForResponseCodes: [401],
                    addJitter: false
                }, {
                    startTime:  new Date()
                })),
                catchError((err, t) => {
                    return of(true);
                }),
            )
            .subscribe(() => done());

    });

    it(`Warning for retry attempt should have been called '${retryAttempts}' times`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(retryAttempts);
    });
});

