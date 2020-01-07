import { of, throwError } from 'rxjs';
import { catchError, retryWhen, switchMap } from 'rxjs/operators';

import { observableRetryStrategy, retryService } from '../../lib';

describe('Retry Rxjs - handle error in retry functionality', () => {
    let exceptionThrown = false;
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll(done => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        // fake error
        const error: any = {
            originalError: undefined
        };

        try {
            of(true)
                .pipe(
                    switchMap(() => {
                        return throwError(error);
                    }),
                    retryWhen(
                        observableRetryStrategy.strategy(
                            {
                                deltaBackoffMs: 100,
                                maxCumulativeWaitTimeMs: 0,
                                addJitter: false,
                                maxAttempts: 100,
                                canRetryError: (xError) => retryService.canRetryErrorDefault(xError),
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
        } catch {
            exceptionThrown = true;
        }
    });

    it(`Retry should not thrown exception when original error is invalid`, () => {
        expect(exceptionThrown).toBeFalsy();
    });
});
