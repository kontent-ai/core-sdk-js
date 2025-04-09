import { afterAll, describe, expect, it, vi } from 'vitest';
import { CoreSdkError } from '../../lib/http/http.models.js';
import type { RetryStrategyOptions } from '../../lib/models/core.models.js';
import { defaultHttpService } from '../../lib/public_api.js';
import { toRequiredRetryStrategyOptions } from '../../lib/utils/retry-helper.js';
import type { FetchResponse } from '../_models/test.models.js';
import { getFetchMock } from '../_utils/test.utils.js';

const testCases: readonly {
    readonly canRetryError: NonNullable<RetryStrategyOptions['canRetryError']>;
    readonly maxRetryAttempts: number;
    readonly expectedRetryAttempts: number;
    readonly fetchResponse: FetchResponse;
}[] = [
    // Default retry - Can retry
    {
        canRetryError: toRequiredRetryStrategyOptions({}).canRetryError,
        maxRetryAttempts: 1,
        expectedRetryAttempts: 1,
        fetchResponse: {
            statusCode: 500,
            json: {}
        }
    },
    // Default retry - Can't retry
    {
        canRetryError: toRequiredRetryStrategyOptions({}).canRetryError,
        maxRetryAttempts: 1,
        expectedRetryAttempts: 0,
        fetchResponse: {
            statusCode: 400,
            json: {}
        }
    },
    // Custom retry - Can't retry
    {
        canRetryError: () => false,
        maxRetryAttempts: 1,
        expectedRetryAttempts: 0,
        fetchResponse: {
            statusCode: 500,
            json: {}
        }
    },
    // Custom retry - Can retry
    {
        canRetryError: () => true,
        maxRetryAttempts: 1,
        expectedRetryAttempts: 1,
        fetchResponse: {
            statusCode: 500,
            json: {}
        }
    }
];

describe('Retry policy - Can retry error', async () => {
    afterAll(() => {
        vi.resetAllMocks();
    });

    for (const testCase of testCases) {
        global.fetch = getFetchMock({
            json: testCase.fetchResponse.json,
            status: testCase.fetchResponse.statusCode
        });

        const error = await resolveResponseAsync(testCase);

        it('Should be an instance of CoreSdkError', () => {
            expect(error).toBeInstanceOf(CoreSdkError);
        });

        if (error instanceof CoreSdkError) {
            it(`Should retry '${testCase.expectedRetryAttempts}' times`, () => {
                expect(error.retryAttempt).toBe(testCase.expectedRetryAttempts);
            });
        }
    }
});

async function resolveResponseAsync(testCase: (typeof testCases)[number]): Promise<unknown> {
    try {
        return await defaultHttpService.getAsync('', {
            retryStrategy: toRequiredRetryStrategyOptions({
                canRetryError: testCase.canRetryError,
                defaultDelayBetweenRequestsMs: 0,
                maxAttempts: testCase.maxRetryAttempts,
                logRetryAttempt: false
            })
        });
    } catch (error) {
        return error;
    }
}
