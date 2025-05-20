import { afterAll, describe, expect, it, vi } from 'vitest';
import { getFetchJsonMock } from '../../lib/devkit/test.utils.js';
import { defaultHttpService } from '../../lib/http/http.service.js';
import { CoreSdkError, type RetryStrategyOptions } from '../../lib/models/core.models.js';
import { toRequiredRetryStrategyOptions } from '../../lib/utils/retry.utils.js';

const testCases: readonly Required<RetryStrategyOptions>[] = [
	toRequiredRetryStrategyOptions({
		maxAttempts: 0,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxAttempts: 1,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxAttempts: 2,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
	toRequiredRetryStrategyOptions({
		maxAttempts: 5,
		defaultDelayBetweenRequestsMs: 0,
		logRetryAttempt: false,
		canRetryError: () => true,
	}),
];

describe('Retry policy - Max attempts', async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	for (const [maxAttempts, retryStrategy] of Object.entries(testCases)) {
		global.fetch = getFetchJsonMock({
			json: {},
			status: 500,
		});

		const error = await resolveResponseAsync(retryStrategy);

		it('Error should be instance of CoreSdkError', () => {
			expect(error).toBeInstanceOf(CoreSdkError);
		});

		if (error instanceof CoreSdkError) {
			it(`Should retry '${maxAttempts}' times`, () => {
				expect(error.sdk.retryAttempt).toStrictEqual(retryStrategy.maxAttempts);
			});
		}
	}
});

async function resolveResponseAsync(retryStrategy: Required<RetryStrategyOptions>): Promise<unknown> {
	try {
		return await defaultHttpService.executeAsync({
			url: '',
			method: 'GET',
			body: null,
			options: { retryStrategy },
		});
	} catch (error) {
		return error;
	}
}
