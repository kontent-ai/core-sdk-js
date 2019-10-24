import { IRetryStrategyOptions } from './http.models';
import { retryService } from './retry-service';

export class PromiseRetryStrategy {
    getPromiseWithRetryStrategy<T>(
        promise: Promise<T>,
        options: IRetryStrategyOptions,
        internal: {
            // reference start time
            startTime: Date;
            // retry attempt
            retryAttempt: number;
        }
    ): Promise<T> {
        return new Promise((resolve, reject) =>
            promise
                .then(response => {
                    resolve(response);
                })
                .catch((promiseError: any) => {
                    internal.retryAttempt++;

                    const currentAttempt = internal.retryAttempt;
                    const statusCode: number = retryService.getStatusCodeFromError(promiseError);

                    if (!retryService.canRetryStatusCode(statusCode, options.useRetryForResponseCodes)) {
                        // request with given status code cannot be retried
                        return reject(promiseError);
                    }

                    if (!retryService.canRetry(internal.startTime, options.maxCumulativeWaitTimeMs)) {
                        // request should not be retried anymore
                        return reject(promiseError);
                    }

                    // get wait time
                    const waitTime = retryService.getNextWaitTimeMs(options.deltaBackoffMs, currentAttempt);

                    // debug log attempt
                    retryService.debugLogAttempt(currentAttempt, waitTime);

                    return this.promiseRetryWait(waitTime)
                        .then(() => {
                            return this.getPromiseWithRetryStrategy(promise, options, {
                                retryAttempt: currentAttempt,
                                startTime: internal.startTime
                            });
                        })
                        .then(response => resolve(response))
                        .catch(error => reject(error));
                })
        );
    }

    private promiseRetryWait(ms: number): Promise<number> {
        return new Promise<number>(r => setTimeout(r, ms));
    }
}

export const promiseRetryStrategy = new PromiseRetryStrategy();
