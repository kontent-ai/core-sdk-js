import { describe, expect, it } from 'vitest';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import type { RetryStrategyOptions } from '../../lib/models/core.models.js';
import { CoreSdkError, HttpServiceParsingError } from '../../lib/models/error.models.js';
import { isParsingError } from '../../lib/utils/error.utils.js';
import { toRequiredRetryStrategyOptions } from '../../lib/utils/retry.utils.js';

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

			if (isParsingError(error.originalError)) {
				expect(error.message).toContain(`Failed to parse url '${url}'.`);
			}
		});
	}
});

async function resolveResponseAsync(): Promise<unknown> {
	try {
		return await getDefaultHttpService({
			retryStrategy: retryStrategyOptions,
		}).requestAsync({
			url,
			method: 'GET',
			body: null,
		});
	} catch (error) {
		return error;
	}
}
