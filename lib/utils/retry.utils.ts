import { CoreSdkError } from '../http/http.models.js';
import type { Header, RetryStrategyOptions } from '../models/core.models.js';
import { getDefaultErrorMessage } from './error.utils.js';
import { getRetryAfterHeaderValue } from './header.utils.js';

type RetryResult =
	| {
			readonly canRetry: false;
	  }
	| {
			readonly canRetry: true;
			readonly retryInMs: number;
	  };

const defaultMaxAttempts: NonNullable<RetryStrategyOptions['maxAttempts']> = 3;
const defaultDelayBetweenAttemptsMs: NonNullable<RetryStrategyOptions['defaultDelayBetweenRequestsMs']> = 1000;
const defaultCanRetryError: NonNullable<RetryStrategyOptions['canRetryError']> = (error) => {
	if (error instanceof CoreSdkError && error.sdk.status) {
		return error.sdk.status >= 500 || error.sdk.status === 429;
	}

	return true;
};

export async function runWithRetryAsync<TResult>(data: {
	readonly funcAsync: () => Promise<TResult>;
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly retryAttempt: number;
	readonly url: string;
	readonly requestHeaders: readonly Header[];
}): Promise<TResult> {
	try {
		return await data.funcAsync();
	} catch (error) {
		const responseHeaders = error instanceof CoreSdkError ? error.sdk.responseHeaders : [];
		const retryResult = getRetryResult({
			error,
			responseHeaders: responseHeaders,
			retryAttempt: data.retryAttempt,
			options: data.retryStrategyOptions,
		});

		if (!retryResult.canRetry) {
			throw new CoreSdkError(
				getDefaultErrorMessage({
					url: data.url,
					retryAttempts: data.retryAttempt,
					status: undefined,
					error,
				}),
				{
					originalError: error instanceof CoreSdkError ? error.sdk.originalError : error,
					responseData: error instanceof CoreSdkError ? error.sdk.responseData : undefined,
					status: error instanceof CoreSdkError ? error.sdk.status : undefined,
					url: data.url,
					retryAttempt: data.retryAttempt,
					retryStrategyOptions: data.retryStrategyOptions,
					responseHeaders: responseHeaders,
					requestHeaders: data.requestHeaders,
				},
			);
		}

		const newRetryAttempt = data.retryAttempt + 1;

		if (data.retryStrategyOptions.logRetryAttempt) {
			data.retryStrategyOptions.logRetryAttempt(newRetryAttempt, data.url);
		}

		// wait before retrying
		await new Promise((resolve) => setTimeout(resolve, retryResult.retryInMs));

		return await runWithRetryAsync({
			funcAsync: data.funcAsync,
			retryStrategyOptions: data.retryStrategyOptions,
			retryAttempt: newRetryAttempt,
			url: data.url,
			requestHeaders: data.requestHeaders,
		});
	}
}

export function toRequiredRetryStrategyOptions(options?: RetryStrategyOptions): Required<RetryStrategyOptions> {
	const maxAttempts: number = options?.maxAttempts ?? defaultMaxAttempts;

	return {
		maxAttempts: maxAttempts,
		canRetryError: options?.canRetryError ?? defaultCanRetryError,
		defaultDelayBetweenRequestsMs: options?.defaultDelayBetweenRequestsMs ?? defaultDelayBetweenAttemptsMs,
		logRetryAttempt:
			options?.logRetryAttempt === false
				? false
				: (attempt, url) => {
						if (options?.logRetryAttempt) {
							options.logRetryAttempt(attempt, url);
						} else {
							console.warn(getDefaultRetryAttemptLogMessage(attempt, maxAttempts, url));
						}
					},
	};
}

export function getDefaultRetryAttemptLogMessage(retryAttempt: number, maxAttempts: number, url: string): string {
	return `Retry attempt '${retryAttempt}' from a maximum of '${maxAttempts}' retries. Requested url: '${url}'`;
}

function getRetryResult({
	retryAttempt,
	error,
	options,
	responseHeaders,
}: {
	readonly retryAttempt: number;
	readonly error: unknown;
	readonly options: Required<RetryStrategyOptions>;
	readonly responseHeaders: readonly Header[];
}): RetryResult {
	if (retryAttempt >= options.maxAttempts) {
		return {
			canRetry: false,
		};
	}

	if (!options.canRetryError(error)) {
		return {
			canRetry: false,
		};
	}

	const retryAfterHeaderValue = getRetryAfterHeaderValue(responseHeaders);

	if (retryAfterHeaderValue) {
		return {
			canRetry: true,
			retryInMs: retryAfterHeaderValue * 1000,
		};
	}

	return {
		canRetry: true,
		retryInMs: options.defaultDelayBetweenRequestsMs,
	};
}
