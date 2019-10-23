import { AxiosError } from 'axios';

import { IBaseResponseError, IHttpQueryOptions, IRetryStrategyOptions } from './http.models';


export class RetryService {
           private readonly defaultRetryPolicy: IRetryStrategyOptions = {
               useRetryForResponseCodes: [408, 429, 500, 502, 503, 504],
               deltaBackoffMs: 1000, // 1 sec
               maxCumulativeWaitTimeMs: 30000 // 30 sec
           };

           getRetryStrategyOptions(httpQueryOptions?: IHttpQueryOptions): IRetryStrategyOptions {
               if (!httpQueryOptions) {
                   return this.defaultRetryPolicy;
               }
               return {
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

           /**
            * Calculates retry attempt timeout in ms
            * @param attempt Index of the attempt to calculate increasing delay when retrying
            */
           getRetryTimeout(attempt: number): number {
               return Math.pow(2, attempt) * 100;
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

           getNextWaitTimeMs(deltaBackoffMs: number, retryAttempts: number): number {
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

           /**
            * min and max included
            */
           private randomNumberFromInterval(min: number, max: number): number {
               return Math.floor(Math.random() * (max - min + 1) + min);
           }
       }

export const retryService = new RetryService();
