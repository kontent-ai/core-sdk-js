import type { Header, RetryStrategyOptions } from '../models/core.models.js';

const defaultMaxAttempts: number = 3;
const defaultDelayBetweenAttemptsMs: number = 1000;
const defaultCanRetryError: (error: unknown) => boolean = () => true;

type RetryResult =
    | {
          readonly canRetry: false;
      }
    | {
          readonly canRetry: true;
          readonly retryInMs: number;
      };

export function toRequiredRetryStrategyOptions(options?: RetryStrategyOptions): Required<RetryStrategyOptions> {
    const maxAttempts: number = options?.maxAttempts ?? defaultMaxAttempts;

    return {
        maxAttempts: maxAttempts,
        canRetryError: options?.canRetryError ?? defaultCanRetryError,
        delayBetweenAttemptsMs: options?.delayBetweenAttemptsMs ?? defaultDelayBetweenAttemptsMs,
        logRetryAttempt: (attempt, url) => {
            if (options?.logRetryAttempt) {
                options.logRetryAttempt(attempt, url);
            } else {
                console.warn(
                    `Retry attempt '${attempt}' from a maximum of '${maxAttempts}' retries. Requested url: '${url}'`
                );
            }
        }
    };
}

export function getRetryResult({
    retryAttempt,
    error,
    options,
    headers
}: {
    readonly retryAttempt: number;
    readonly error: unknown;
    readonly options: Required<RetryStrategyOptions>;
    readonly headers: readonly Header[];
}): RetryResult {
    if (retryAttempt >= options.maxAttempts) {
        return {
            canRetry: false
        };
    }

    if (!options.canRetryError(error)) {
        return {
            canRetry: false
        };
    }

    const retryAfterHeaderValue = getRetryAfterHeaderValue(headers);

    if (retryAfterHeaderValue) {
        return {
            canRetry: true,
            retryInMs: retryAfterHeaderValue * 1000
        };
    }

    return {
        canRetry: true,
        retryInMs: options.delayBetweenAttemptsMs
    };
}

function getRetryAfterHeaderValue(headers: readonly Header[]): number | undefined {
    const retryAfterHeader = headers.find((header) => header.header === 'Retry-After');

    if (!retryAfterHeader) {
        return undefined;
    }

    return +retryAfterHeader.value;
}
