import { describe, expect, it } from 'vitest';
import { CoreSdkError } from '../lib/http/http.models.js';
import { defaultHttpService, getDefaultErrorMessage } from '../lib/http/http.service.js';
import type { RetryStrategyOptions } from '../lib/models/core.models.js';
import { toRequiredRetryStrategyOptions } from '../lib/utils/retry-helper.js';

const url = 'invalid-url';
const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions({
    maxAttempts: 0,
    logRetryAttempt: false,
    delayBetweenAttemptsMs: 0
});

describe('Failed requests', async () => {
    const error = await resolveResponseAsync();

    it('Error should be instance of CoreSdkError', () => {
        expect(error).toBeInstanceOf(CoreSdkError);
    });

    if (error instanceof CoreSdkError) {
        it('Error properties should be correctly mapped', () => {
            expect(error.url).toStrictEqual(url);
            expect(error.responseHeaders).toStrictEqual([]);

            // undefined because we don't have a response status
            expect(error.status).toStrictEqual(undefined);

            // +1 attempts because we also count the initial attempt and then the retry maxAttempts
            const retryAttempts = (retryStrategyOptions.maxAttempts ?? 0) + 1;

            expect(error.retryAttempt).toStrictEqual(retryAttempts);
            expect(error.message).toStrictEqual(
                getDefaultErrorMessage({
                    url,
                    retryAttempts,
                    status: undefined
                })
            );

            // original error thrown by the fetch API
            expect(error.originalError).toBeInstanceOf(Error);
        });
    }
});

async function resolveResponseAsync(): Promise<unknown> {
    try {
        await defaultHttpService.getAsync(url, { retryStrategy: retryStrategyOptions });
        throw new Error('Request should have failed');
    } catch (error) {
        return error;
    }
}
