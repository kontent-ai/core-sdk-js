import { afterAll, describe, expect, it, vi } from 'vitest';
import type { FetchResponse } from '../../lib/devkit/devkit.models.js';
import { getFetchJsonMock } from '../../lib/devkit/test.utils.js';
import { CoreSdkError } from '../../lib/http/http.models.js';
import type { RetryStrategyOptions } from '../../lib/models/core.models.js';
import { defaultHttpService } from '../../lib/public_api.js';
import { toRequiredRetryStrategyOptions } from '../../lib/utils/retry.utils.js';

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
			json: {},
		},
	},
	// Default retry - Can't retry
	{
		canRetryError: toRequiredRetryStrategyOptions({}).canRetryError,
		maxRetryAttempts: 1,
		expectedRetryAttempts: 0,
		fetchResponse: {
			statusCode: 400,
			json: {},
		},
	},
	// Custom retry - Can't retry
	{
		canRetryError: () => false,
		maxRetryAttempts: 1,
		expectedRetryAttempts: 0,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	// Custom retry - Can retry
	{
		canRetryError: () => true,
		maxRetryAttempts: 1,
		expectedRetryAttempts: 1,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
];

describe('Retry policy - Can retry error', async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	for (const testCase of testCases) {
		global.fetch = getFetchJsonMock({
			json: testCase.fetchResponse.json,
			status: testCase.fetchResponse.statusCode,
		});

		const error = await resolveResponseAsync(testCase);

		it('Should be an instance of CoreSdkError', () => {
			expect(error).toBeInstanceOf(CoreSdkError);
		});

		if (error instanceof CoreSdkError) {
			it(`Should retry '${testCase.expectedRetryAttempts}' times`, () => {
				expect(error.sdk.retryAttempt).toBe(testCase.expectedRetryAttempts);
			});
		}
	}
});

async function resolveResponseAsync(testCase: (typeof testCases)[number]): Promise<unknown> {
	try {
		return await defaultHttpService.executeAsync({
			url: '',
			method: 'GET',
			body: null,
			options: {
				retryStrategy: toRequiredRetryStrategyOptions({
					canRetryError: testCase.canRetryError,
					defaultDelayBetweenRequestsMs: 0,
					maxAttempts: testCase.maxRetryAttempts,
					logRetryAttempt: false,
				}),
			},
		});
	} catch (error) {
		return error;
	}
}
