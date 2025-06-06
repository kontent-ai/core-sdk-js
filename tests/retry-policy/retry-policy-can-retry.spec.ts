import { afterAll, describe, expect, it, vi } from 'vitest';
import type { FetchResponse } from '../../lib/devkit/devkit.models.js';
import { getFetchJsonMock } from '../../lib/devkit/test.utils.js';
import type { HttpResponse } from '../../lib/http/http.models.js';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import type { RetryStrategyOptions } from '../../lib/models/core.models.js';
import { toRequiredRetryStrategyOptions } from '../../lib/utils/retry.utils.js';
import { getIntegrationTestConfig } from '../integration-tests.config.js';

const testCases: readonly {
	readonly title: string;
	readonly canRetryError: NonNullable<RetryStrategyOptions['canRetryError']>;
	readonly maxRetryAttempts: number;
	readonly expectedRetryAttempts: number;
	readonly fetchResponse: FetchResponse;
}[] = [
	{
		title: 'Default retry - Can retry',
		canRetryError: toRequiredRetryStrategyOptions({}).canRetryError,
		maxRetryAttempts: 1,
		expectedRetryAttempts: 1,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	{
		title: `Default retry - Can't retry`,
		canRetryError: toRequiredRetryStrategyOptions({}).canRetryError,
		maxRetryAttempts: 0,
		expectedRetryAttempts: 0,
		fetchResponse: {
			statusCode: 400,
			json: {},
		},
	},
	{
		title: `Custom retry - Can't retry`,
		canRetryError: () => false,
		maxRetryAttempts: 1,
		expectedRetryAttempts: 0,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
	{
		title: 'Custom retry - Can retry',
		canRetryError: () => true,
		maxRetryAttempts: 1,
		expectedRetryAttempts: 1,
		fetchResponse: {
			statusCode: 500,
			json: {},
		},
	},
];

for (const testCase of testCases) {
	describe(testCase.title, async () => {
		afterAll(() => {
			vi.resetAllMocks();
		});

		global.fetch = getFetchJsonMock({
			json: testCase.fetchResponse.json,
			status: testCase.fetchResponse.statusCode,
		});

		const { success, error } = await resolveResponseAsync(testCase);

		it('Success should be false', () => {
			expect(success).toBe(false);
		});

		it('Error should be defined', () => {
			expect(error).toBeDefined();
		});

		it(`Should retry '${testCase.expectedRetryAttempts}' times`, () => {
			expect(error?.retryAttempt).toBe(testCase.expectedRetryAttempts);
		});
	});
}

async function resolveResponseAsync(testCase: (typeof testCases)[number]): Promise<HttpResponse<null, null>> {
	return await getDefaultHttpService({
		retryStrategy: toRequiredRetryStrategyOptions({
			canRetryError: testCase.canRetryError,
			defaultDelayBetweenRequestsMs: 0,
			maxAttempts: testCase.maxRetryAttempts,
			logRetryAttempt: false,
		}),
	}).requestAsync({
		// we need valid url
		url: getIntegrationTestConfig().urls.baseMapiUrl,
		method: 'GET',
		body: null,
	});
}
