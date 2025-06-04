import { afterAll, describe, expect, it, vi } from 'vitest';
import { getFetchJsonMock } from '../../lib/devkit/test.utils.js';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import type { RetryStrategyOptions } from '../../lib/models/core.models.js';
import { CoreSdkError } from '../../lib/models/error.models.js';
import { isCoreSdkError } from '../../lib/utils/error.utils.js';
import { toRequiredRetryStrategyOptions } from '../../lib/utils/retry.utils.js';
import { tryCatchAsync } from '../../lib/utils/try.utils.js';

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

		if (isCoreSdkError(error)) {
			it(`Should retry '${maxAttempts}' times`, () => {
				expect(error.retryAttempt).toStrictEqual(retryStrategy.maxAttempts);
			});
		}
	}
});

async function resolveResponseAsync(retryStrategy: Required<RetryStrategyOptions>): Promise<unknown> {
	const { error } = await tryCatchAsync(async () => {
		return await getDefaultHttpService({ retryStrategy }).requestAsync({
			url: '',
			method: 'GET',
			body: null,
		});
	});

	return error;
}
