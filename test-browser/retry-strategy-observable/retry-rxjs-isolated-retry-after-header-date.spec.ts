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

        const retryAfterSeconds: number = 2;
        const retryAfterDate: Date = new Date();
        retryAfterDate.setSeconds(retryAfterDate.getSeconds() + retryAfterSeconds);

        // fake error
        const error: any = {
            originalError: <AxiosError>{
                response: {
                    config: {} as any,
                    data: {} as any,
                    statusText: 'z',
                    status: 429,
                    headers: {
                        'Retry-After': retryAfterDate.toUTCString()
                    }
                },
                isAxiosError: true,
                config: {} as any,
                name: 'x',
                message: 'y',
                toJSON: () => {
                    return {};
                }
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
    });

    it(`Warning for retry attempt should have been called '${expectedRetryAttempts}' times`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(expectedRetryAttempts);
    });
});
