import { of, throwError } from 'rxjs';
import { catchError, retryWhen, switchMap } from 'rxjs/operators';

import { retryService, observableRetryStrategy } from '../../lib';
import { AxiosError } from 'axios';

describe('Retry Rxjs - retry after header in date format', () => {
    const expectedRetryAttempts = 1;
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll(done => {
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

        of(true)
            .pipe(
                switchMap(() => {
                    return throwError(error);
                }),
                retryWhen(
                    observableRetryStrategy.strategy(
                        {
                            deltaBackoffMs: 100,
                            maxCumulativeWaitTimeMs: 100,
                            useRetryForResponseCodes: [401],
                            addJitter: false
                        },
                        {
                            startTime: new Date()
                        }
                    )
                ),
                catchError((err, t) => {
                    return of(true);
                })
            )
            .subscribe(() => done());
    });

    it(`Warning for retry attempt should have been called '${expectedRetryAttempts}' times`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(expectedRetryAttempts);
    });
});
