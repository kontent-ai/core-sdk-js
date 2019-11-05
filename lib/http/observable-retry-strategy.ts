import { Observable, throwError, timer } from 'rxjs';
import { flatMap } from 'rxjs/operators';

import { IBaseResponseError, IRetryStrategyOptions } from './http.models';
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
            flatMap((error: IBaseResponseError<any>, i: number) => {
                const retryAttempt = i + 1;
                const statusCode: number = retryService.getStatusCodeFromError(error);
                const retryAfter: number | undefined = retryService.tryGetRetryAfterInMsFromError(error);

                if (!retryService.canRetryStatusCode(statusCode, options.useRetryForResponseCodes)) {
                    // request with given status code cannot be retried
                    return throwError(error);
                }

                if (!retryService.canRetry(internal.startTime, options.maxCumulativeWaitTimeMs)) {
                    // request should not be retried anymore
                    return throwError(error);
                }

                // get wait time
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
