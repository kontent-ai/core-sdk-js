import { of, throwError } from 'rxjs';
import { catchError, retryWhen, switchMap } from 'rxjs/operators';

import { observableRetryStrategy, retryService } from '../../lib';

describe('Retry Rxjs - retry error func do not retry', () => {
    const expectedRetryAttempts = 0;
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll(done => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        // fake error
        const error: any = {
            originalError: {
                message: 'Unknown error'
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
                            deltaBackoffMs: 0,
                            maxCumulativeWaitTimeMs: 50000,
                            maxAttempts: 5,
                            addJitter: false,
                            canRetryError: (xError: any) => {
                                return false;
                            }
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
