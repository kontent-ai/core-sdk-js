import { describe, expect, it } from 'vitest';
import { CoreSdkError } from '../lib/http/http.models.js';
import { defaultHttpService, getDefaultErrorMessage } from '../lib/http/http.service.js';
import type { RetryStrategyOptions } from '../lib/models/core.models.js';
import { toRequiredRetryStrategyOptions } from '../lib/utils/retry-helper.js';

const url = 'invalid-url';
const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions({
    maxAttempts: 0,
    logRetryAttempt: false,
    defaultDelayBetweenRequestsMs: 0
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

            const retryAttempts = retryStrategyOptions.maxAttempts;

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
        return await defaultHttpService.getAsync(url, { retryStrategy: retryStrategyOptions });
    } catch (error) {
        return error;
    }
}
