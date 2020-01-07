import { AxiosError } from 'axios';

import { extractHeadersFromAxiosResponse } from './headers-helper';
import { IHeader, IRetryStrategyOptions } from './http.models';

export class RetryService {
    private readonly retryAfterHeaderName: string = 'Retry-After';
    private readonly useRetryForStatusCodes: number[] = [408, 429, 500, 502, 503, 504];

    private readonly defaultRetryPolicy: IRetryStrategyOptions = {
        addJitter: true,
        deltaBackoffMs: 1000, // 1 sec
        maxCumulativeWaitTimeMs: 30000, // 30 sec,
        maxAttempts: 20, // 20 requests
        canRetryError: (error) => this.canRetryErrorDefault(error)
    };

    getRetryStrategyFromStrategyOptions(retryOptions?: IRetryStrategyOptions): IRetryStrategyOptions {
        if (!retryOptions) {
            return this.defaultRetryPolicy;
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

    /**
     * Logs attempt in console.
     * This function is also used for testing in jasmine spy
     */
    debugLogAttempt(attempt: number, waitTime: number): void {
        console.warn(`Attempt ${attempt}: retrying in ${waitTime}ms`);
    }

    getNextWaitTimeMs(
        addJitter: boolean,
        deltaBackoffMs: number,
        retryAttempts: number,
        retryAfterInMs: number | undefined
    ): number {
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

    canRetryErrorDefault(error: any): boolean {
        const axiosError = this.tryGetAxiosError(error);

        if (!axiosError) {
            // by default non-axios errors are not retried
            return false;
        }

        const statusCode: number = this.getStatusCodeFromError(error);
        const canRetryStatusCode: boolean = this.canRetryStatusCode(
            statusCode,
            this.useRetryForStatusCodes
        );

        if (canRetryStatusCode) {
            return true;
        }

        return false;
    }

    canRetryStatusCode(statusCode: number, useRetryForResponseCodes: number[]): boolean {
        return useRetryForResponseCodes.includes(statusCode);
    }

    isAxiosError(error: any): boolean {
        return this.tryGetAxiosError(error)?.isAxiosError ?? false;
    }

    getStatusCodeFromError(error: any): number {
        const axiosError = this.tryGetAxiosError(error);

        if (!axiosError || !axiosError.response) {
            return 0;
        }

        return axiosError.response.status;
    }

    tryGetRetryAfterInMsFromError(error: any): number | undefined {
        const axiosError = this.tryGetAxiosError(error);

        if (!axiosError || !axiosError.response) {
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
            const retryValueInMs = +retryValue * 1000;
            return retryValueInMs;
        }
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

export const retryService = new RetryService();
