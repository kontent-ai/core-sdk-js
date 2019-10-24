import { of, throwError } from 'rxjs';
import { catchError, retryWhen, switchMap } from 'rxjs/operators';

import { retryService, observableRetryStrategy } from '../../lib';
import { AxiosError } from 'axios';

describe('Retry Rxjs - skipped status codes', () => {
    const retryAttempts = 0;
    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll((done) => {
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

        of(true)
            .pipe(
                switchMap(() => {
                    return throwError(error);
                }),
                retryWhen(observableRetryStrategy.strategy({
                    deltaBackoffMs: 1000,
                    maxCumulativeWaitTimeMs: 10000,
                    useRetryForResponseCodes: [401, 500, 420, 422]
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

