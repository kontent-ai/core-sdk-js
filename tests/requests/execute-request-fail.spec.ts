import { describe, expect, it } from 'vitest';
import { CoreSdkError, HttpServiceParsingError } from '../../lib/models/core.models.js';
import type { RetryStrategyOptions } from '../../lib/public_api.js';
import { getDefaultHttpService, toRequiredRetryStrategyOptions } from '../../lib/public_api.js';

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
			expect(error.url).toStrictEqual(url);
			expect(error.originalError).toBeInstanceOf(HttpServiceParsingError);
			expect(error.retryAttempt).toStrictEqual(retryStrategyOptions.maxAttempts);

			if (error.originalError instanceof HttpServiceParsingError) {
				expect(error.message).toContain(`Failed to parse url '${url}'.`);
			}
		});
	}
});

async function resolveResponseAsync(): Promise<unknown> {
	try {
		return await getDefaultHttpService().executeAsync({
			url,
			method: 'GET',
			body: null,
			options: { retryStrategy: retryStrategyOptions },
		});
	} catch (error) {
		return error;
	}
}
