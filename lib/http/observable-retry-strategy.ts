import { Observable, throwError, timer } from 'rxjs';
import { flatMap } from 'rxjs/operators';

import { IRetryStrategyOptions } from './http.models';
import { retryService } from './retry-service';

export class ObservableRetryStrategy {
    strategy = (
        options: IRetryStrategyOptions,
        internal: {
            // reference start time
            startTime: Date;
        }
    ) => (errorObs: Observable<any>) => {
        return errorObs.pipe(
            flatMap((error: any, i: number) => {
                const canRetryError: boolean = options.canRetryError(error);

                if (!canRetryError) {
                    // request cannot be retried
                    return throwError(error);
                }


                const retryAttempt = i + 1;

                const maximumRetryAttemptsMet: boolean = retryAttempt > options.maxAttempts;

                if (maximumRetryAttemptsMet) {
                    // request cannot be retried anymore due to maximum attempts
                    return throwError(error);
                }

                const retryInTimeResult = retryService.canRetryInTime(
                    internal.startTime,
                    options.maxCumulativeWaitTimeMs
                );

                if (!retryInTimeResult.canRetry) {
                    // request should not be retried anymore as allowed time expired
                    return throwError(error);
                }

                // get wait time
                const retryAfter: number | undefined = retryService.tryGetRetryAfterInMsFromError(error);
                const waitTime = retryService.getNextWaitTimeMs(
                    options.addJitter,
                    options.deltaBackoffMs,
                    retryAttempt,
                    retryAfter
                );

                // debug log attempt
                retryService.debugLogAttempt(retryAttempt, waitTime);

                return timer(waitTime);
            })
        );
    }
}

export const observableRetryStrategy = new ObservableRetryStrategy();
