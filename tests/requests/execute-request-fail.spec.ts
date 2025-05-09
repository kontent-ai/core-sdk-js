import { describe, expect, it } from 'vitest';
import type { RetryStrategyOptions } from '../../lib/public_api.js';
import { CoreSdkError, defaultHttpService, toRequiredRetryStrategyOptions } from '../../lib/public_api.js';
import { getDefaultErrorMessage } from '../../lib/utils/error.utils.js';

const url = 'invalid-url';
const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions({
	maxAttempts: 0,
	logRetryAttempt: false,
	defaultDelayBetweenRequestsMs: 0,
});

describe('Execute request - Fail', async () => {
	const error = await resolveResponseAsync();

	it('Error should be instance of CoreSdkError', () => {
		expect(error).toBeInstanceOf(CoreSdkError);
	});

	if (error instanceof CoreSdkError) {
		it('Error properties should be correctly mapped', () => {
			expect(error.sdk.url).toStrictEqual(url);
			expect(error.sdk.responseHeaders).toStrictEqual([]);

			// undefined because we don't have a response status
			expect(error.sdk.status).toStrictEqual(undefined);

			const retryAttempts = retryStrategyOptions.maxAttempts;

			expect(error.sdk.retryAttempt).toStrictEqual(retryAttempts);
			expect(error.message).toStrictEqual(
				getDefaultErrorMessage({
					url,
					retryAttempts,
					status: undefined,
					error: new Error(`Failed to parse URL from ${url}`),
				}),
			);

			// original error thrown by the fetch API
			expect(error.sdk.originalError).toBeInstanceOf(Error);
		});
	}
});

async function resolveResponseAsync(): Promise<unknown> {
	try {
		return await defaultHttpService.executeAsync({
			url,
			method: 'GET',
			body: null,
			options: { retryStrategy: retryStrategyOptions },
		});
	} catch (error) {
		return error;
	}
}
