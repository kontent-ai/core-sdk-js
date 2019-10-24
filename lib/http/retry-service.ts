import { AxiosError } from 'axios';

import { IBaseResponseError, IHttpQueryOptions, IRetryStrategyOptions, IHeader } from './http.models';
import { extractHeadersFromAxiosResponse } from './headers-helper';

export class RetryService {

    private readonly retryAfterHeaderName: string = 'Retry-After';

    private readonly defaultRetryPolicy: IRetryStrategyOptions = {
        addJitter: true,
        useRetryForResponseCodes: [408, 429, 500, 502, 503, 504],
        deltaBackoffMs: 1000, // 1 sec
        maxCumulativeWaitTimeMs: 30000 // 30 sec
    };

    getRetryStrategyFromStrategyOptions(retryOptions?: IRetryStrategyOptions): IRetryStrategyOptions {
        if (!retryOptions) {
            return this.defaultRetryPolicy;
        }

        return {
            addJitter: this.getBoolOrDefault(retryOptions.addJitter, this.defaultRetryPolicy.addJitter),
            deltaBackoffMs: retryOptions.deltaBackoffMs
                ? retryOptions.deltaBackoffMs
                : this.defaultRetryPolicy.deltaBackoffMs,
            maxCumulativeWaitTimeMs: retryOptions.maxCumulativeWaitTimeMs
                ? retryOptions.maxCumulativeWaitTimeMs
                : this.defaultRetryPolicy.maxCumulativeWaitTimeMs,
            useRetryForResponseCodes: retryOptions.useRetryForResponseCodes
                ? retryOptions.useRetryForResponseCodes
                : this.defaultRetryPolicy.useRetryForResponseCodes
        };
    }

    getRetryStrategyFromHttpQueryOptions(httpQueryOptions?: IHttpQueryOptions): IRetryStrategyOptions {
        if (!httpQueryOptions) {
            return this.defaultRetryPolicy;
        }

        return {
            addJitter: this.getBoolOrDefault(httpQueryOptions.addJitterToRetryAttempts, this.defaultRetryPolicy.addJitter),
            deltaBackoffMs: httpQueryOptions.deltaBackoffMs
                ? httpQueryOptions.deltaBackoffMs
                : this.defaultRetryPolicy.deltaBackoffMs,
            maxCumulativeWaitTimeMs: httpQueryOptions.maxCumulativeWaitTimeMs
                ? httpQueryOptions.maxCumulativeWaitTimeMs
                : this.defaultRetryPolicy.maxCumulativeWaitTimeMs,
            useRetryForResponseCodes: httpQueryOptions.useRetryForResponseCodes
                ? httpQueryOptions.useRetryForResponseCodes
                : this.defaultRetryPolicy.useRetryForResponseCodes
        };
    }

    canRetry(startTime: Date, maxCumulativeWaitTimeMs: number): boolean {
        const start = startTime.getTime();
        const now = new Date().getTime();

        const differenceInMs = now - start;

        return differenceInMs < maxCumulativeWaitTimeMs;
    }

    /**
     * Logs attempt in console.
     * This function is also used for testing in jasmine spy
     */
    debugLogAttempt(attempt: number, waitTime: number): void {
        console.warn(`Attempt ${attempt}: retrying in ${waitTime}ms`);
    }

    getNextWaitTimeMs(addJitter: boolean, deltaBackoffMs: number, retryAttempts: number, retryAfterInMs: number | undefined): number {
        if (retryAfterInMs) {
            return retryAfterInMs;
        }

        if (!addJitter) {
            return deltaBackoffMs * Math.pow(2, retryAttempts);
        }

        const from: number = 0.8 * deltaBackoffMs;
        const to: number = 1.2 * deltaBackoffMs * Math.pow(2, retryAttempts);

        return this.randomNumberFromInterval(from, to);
    }

    canRetryStatusCode(statusCode: number, useRetryForResponseCodes: number[]): boolean {
        return useRetryForResponseCodes.includes(statusCode);
    }

    getStatusCodeFromError(error: IBaseResponseError<any>): number {
        const originalError = error.originalError;
        if (!originalError.isAxiosError) {
            return 0;
        }
        const axiosError: AxiosError = originalError as AxiosError;
        if (!axiosError.response) {
            return 0;
        }

        return axiosError.response.status;
    }

    tryGetRetryAfterInMsFromError(error: IBaseResponseError<any>): number | undefined {
        const originalError = error.originalError;
        if (!originalError.isAxiosError) {
            return undefined;
        }

        const axiosError: AxiosError = originalError as AxiosError;

        if (!axiosError.response || !axiosError.response.headers) {
            return undefined;
        }

        const headers: IHeader[] = extractHeadersFromAxiosResponse(axiosError.response);

        const retryValueHeader = headers.find(m => m.header.toLowerCase() === this.retryAfterHeaderName.toLowerCase());
        if (!retryValueHeader) {
            return undefined;
        }

        const retryValue = retryValueHeader.value;

        if (isNaN(+retryValue)) {
            // header is date
            const retryAfter = new Date(retryValue).getTime();
            const now = new Date().getTime();

            const differenceInMs = retryAfter - now;
            return differenceInMs;


        } else {
            // header is number
            const retryValueInMs = (+retryValue) * 1000;
            return retryValueInMs;
        }
    }

    private getBoolOrDefault(value: boolean | undefined, defaultValue: boolean): boolean {
        if (typeof value === 'undefined') {
            return defaultValue;
        }
        return value;
    }

    /**
     * min and max included
     */
    private randomNumberFromInterval(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}

export const retryService = new RetryService();
