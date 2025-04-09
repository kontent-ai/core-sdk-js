import { afterAll, describe, expect, it, vi } from 'vitest';
import { CoreSdkError } from '../../lib/http/http.models.js';
import { defaultHttpService } from '../../lib/http/http.service.js';
import type { RetryStrategyOptions } from '../../lib/models/core.models.js';
import { toRequiredRetryStrategyOptions } from '../../lib/utils/retry-helper.js';
import { getFetchMock } from '../_utils/test.utils.js';

const testCases: readonly Required<RetryStrategyOptions>[] = [
    toRequiredRetryStrategyOptions({ maxAttempts: 0, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false }),
    toRequiredRetryStrategyOptions({ maxAttempts: 1, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false }),
    toRequiredRetryStrategyOptions({ maxAttempts: 2, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false }),
    toRequiredRetryStrategyOptions({ maxAttempts: 5, defaultDelayBetweenRequestsMs: 0, logRetryAttempt: false })
];

describe('Retry policy - Max attempts', async () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    for (const [maxAttempts, retryStrategy] of Object.entries(testCases)) {
        global.fetch = getFetchMock({
            json: {},
            status: 500
        });

        const error = await resolveResponseAsync(retryStrategy);

        it('Error should be instance of CoreSdkError', () => {
            expect(error).toBeInstanceOf(CoreSdkError);
        });

        if (error instanceof CoreSdkError) {
            it(`Should retry '${maxAttempts}' times`, () => {
                expect(error.retryAttempt).toStrictEqual(retryStrategy.maxAttempts);
            });
        }
    }
});

async function resolveResponseAsync(retryStrategy: Required<RetryStrategyOptions>): Promise<unknown> {
    try {
        return await defaultHttpService.getAsync('', { retryStrategy });
    } catch (error) {
        return error;
    }
}
