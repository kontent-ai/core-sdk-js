import { describe, expect, it } from 'vitest';
import { CoreSdkError } from '../lib/http/http.models.js';
import { defaultHttpService } from '../lib/http/http.service.js';
import type { RetryStrategyOptions } from '../lib/models/core.models.js';
import { toRequiredRetryStrategyOptions } from '../lib/utils/retry-helper.js';

const url = 'retry-test-url';

const retryCases: readonly Required<RetryStrategyOptions>[] = [
    toRequiredRetryStrategyOptions({ maxAttempts: 0, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false }),
    toRequiredRetryStrategyOptions({ maxAttempts: 1, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false }),
    toRequiredRetryStrategyOptions({ maxAttempts: 2, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false }),
    toRequiredRetryStrategyOptions({ maxAttempts: 5, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false })
];

describe('Retry policy', async () => {
    for (const [maxAttempts, retryStrategy] of Object.entries(retryCases)) {
        const error = await resolveResponseAsync(retryStrategy);

        it('Error should be instance of CoreSdkError', () => {
            expect(error).toBeInstanceOf(CoreSdkError);
        });

        if (error instanceof CoreSdkError) {
            it(`Should retry ${maxAttempts} times`, () => {
                expect(error.retryAttempt).toStrictEqual(retryStrategy.maxAttempts + 1);
            });
        }
    }
});

async function resolveResponseAsync(retryStrategy: Required<RetryStrategyOptions>): Promise<unknown> {
    try {
        await defaultHttpService.getAsync(url, { retryStrategy });
        throw new Error('Request should have failed');
    } catch (error) {
        return error;
    }
}
