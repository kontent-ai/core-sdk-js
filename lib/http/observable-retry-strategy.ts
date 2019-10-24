import { Observable, throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IBaseResponseError, IRetryStrategyOptions } from './http.models';
import { retryService } from './retry-service';

export class ObservableRetryStrategy {
    strategy = (
        options: IRetryStrategyOptions,
        internal: {
            // reference start time
            startTime: Date;
        }
    ) => (attempts: Observable<any>) => {

        console.log('get retry strategy', attempts);

        return attempts.pipe(
            mergeMap((error: IBaseResponseError<any>, i: number) => {
                console.log('attempt', i);
                const retryAttempt = i + 1;
                const statusCode: number = retryService.getStatusCodeFromError(error);
                const retryAfter: number | undefined = retryService.tryGetRetryAfterInMsFromError(error);

                console.log(statusCode, retryAfter);
                if (!retryService.canRetryStatusCode(statusCode, options.useRetryForResponseCodes)) {
                    // request with given status code cannot be retried
                    console.log('no retry 1');
                    return throwError(error);
                }

                if (!retryService.canRetry(internal.startTime, options.maxCumulativeWaitTimeMs)) {
                    // request should not be retried anymore
                    console.log('no retry 1');
                    return throwError(error);
                }

                // get wait time
                const waitTime = retryService.getNextWaitTimeMs(options.addJitter, options.deltaBackoffMs, retryAttempt, retryAfter);

                // debug log attempt
                retryService.debugLogAttempt(retryAttempt, waitTime);

                console.log('wait', waitTime);
                return timer(waitTime);
            })
        );
    }
}

export const observableRetryStrategy = new ObservableRetryStrategy();
