import { AxiosError } from 'axios';

import { extractHeadersFromAxiosResponse } from './headers-helper';
import { IHeader, IRetryStrategyOptions } from '../http/http.models';

export class RetryHelper {
    public readonly requestCancelledMessagePrefix: string = 'Request cancelled';
    public readonly retryAfterHeaderName: string = 'Retry-After';
    public readonly defaultRetryStatusCodes: number[] = [408, 429, 500, 502, 503, 504];
    public readonly defaultRetryStrategy = {
        addJitter: true,
        deltaBackoffMs: 1000, // 1 sec
        maxAttempts: 5,
        canRetryError: (error: any) => this.canRetryErrorDefault(error)
    };

    getRetryErrorResult(data: {
        retryAttempt: number;
        error: any;
        retryStrategy: IRetryStrategyOptions;
    }): {
        retryInMs: number;
        canRetry: boolean;
        maxRetries: number;
    } {
        if (data.error && data.error.message) {
            if ((<string>data.error.message).startsWith(this.requestCancelledMessagePrefix)) {
                // request was cancelled by user, do not retry it
                return {
                    canRetry: false,
                    retryInMs: 0,
                    maxRetries: 0
                };
            }
        }

        const canRetryError: boolean = data.retryStrategy.canRetryError
            ? data.retryStrategy.canRetryError(data.error)
            : this.defaultRetryStrategy.canRetryError(data.error);

        if (!canRetryError) {
            // request cannot be retried
            return {
                canRetry: false,
                retryInMs: 0,
                maxRetries: 0
            };
        }

        const maxRetries: number = (data.retryStrategy.maxAttempts ?? this.defaultRetryStrategy.maxAttempts);

        const maxRetriesReached: boolean =
            data.retryAttempt >= maxRetries;

        if (maxRetriesReached) {
            // request cannot be retried anymore due to maximum attempts
            return {
                canRetry: false,
                retryInMs: 0,
                maxRetries: maxRetries
            };
        }
        // get wait time
        const retryResult: number | undefined = this.tryGetRetryAfterInMsFromError(data.error);

        if (retryResult) {
            // retry after header was provided
            return {
                canRetry: true,
                retryInMs: retryResult,
                maxRetries: maxRetries
            };
        }

        // wait time was not provided in header
        const waitTimeMs = this.getNextWaitTimeMs(
            data.retryStrategy.addJitter ?? this.defaultRetryStrategy.addJitter,
            data.retryStrategy.deltaBackoffMs ?? this.defaultRetryStrategy.deltaBackoffMs,
            data.retryAttempt
        );

        return {
            canRetry: true,
            retryInMs: waitTimeMs,
            maxRetries: maxRetries
        };
    }

    getRetryStrategyFromStrategyOptions(retryOptions?: IRetryStrategyOptions): IRetryStrategyOptions {
        if (!retryOptions) {
            return this.defaultRetryStrategy;
        }

        return retryOptions;
    }

    canRetryInTime(
        startTime: Date,
        maxCumulativeWaitTimeMs: number
    ): {
        canRetry: boolean;
        differenceInMs: number;
    } {
        const start = startTime.getTime();
        const now = new Date().getTime();

        const differenceInMs = now - start;

        return {
            canRetry: differenceInMs < maxCumulativeWaitTimeMs,
            differenceInMs: differenceInMs
        };
    }

    private getNextWaitTimeMs(addJitter: boolean, deltaBackoffMs: number, retryAttempts: number): number {
        if (!addJitter) {
            return deltaBackoffMs * Math.pow(2, retryAttempts);
        }

        const from: number = 0.8 * deltaBackoffMs;
        const to: number = 1.2 * deltaBackoffMs * Math.pow(2, retryAttempts);

        return this.randomNumberFromInterval(from, to);
    }

    private canRetryErrorDefault(error: any): boolean {
        const axiosError = this.tryGetAxiosError(error);

        if (!axiosError) {
            // by default non-axios errors are not retried
            return false;
        }

        const statusCode: number = this.getStatusCodeFromError(error);
        const canRetryStatusCode: boolean = this.canRetryStatusCode(statusCode, this.defaultRetryStatusCodes);

        if (canRetryStatusCode) {
            return true;
        }

        return false;
    }

    private tryGetRetryAfterInMsFromError(error: any): number | undefined {
        const axiosError = this.tryGetAxiosError(error);

        if (!axiosError || !axiosError.response) {
            return undefined;
        }

        const headers: IHeader[] = extractHeadersFromAxiosResponse(axiosError.response);

        const retryValueHeader = headers.find(
            (m) => m.header.toLowerCase() === this.retryAfterHeaderName.toLowerCase()
        );
        if (!retryValueHeader) {
            return undefined;
        }

        const retryInSeconds = +retryValueHeader.value;

        return retryInSeconds * 1000;
    }

    private canRetryStatusCode(statusCode: number, useRetryForResponseCodes: number[]): boolean {
        return useRetryForResponseCodes.includes(statusCode);
    }

    private getStatusCodeFromError(error: any): number {
        const axiosError = this.tryGetAxiosError(error);

        if (!axiosError || !axiosError.response) {
            return 0;
        }

        return axiosError.response.status;
    }

    private tryGetAxiosError(error: any): AxiosError | undefined {
        if (!error) {
            return undefined;
        }

        if (error.isAxiosError) {
            return error as AxiosError;
        }

        const originalError = error.originalError;
        if (originalError && originalError.isAxiosError) {
            return originalError as AxiosError;
        }

        return undefined;
    }

    /**
     * min and max included
     */
    private randomNumberFromInterval(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}

export const retryHelper = new RetryHelper();
