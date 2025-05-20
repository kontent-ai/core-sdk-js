import {
	CoreSdkError,
	type Header,
	type HttpMethod,
	HttpServiceInvalidResponseError,
	HttpServiceParsingError,
	type RetryStrategyOptions,
} from '../models/core.models.js';
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
	if (error instanceof HttpServiceInvalidResponseError) {
		if (error.kontentErrorResponse) {
			// The request is clearly invalid as we got an error response from the API
			return false;
		}

		return error.statusCode >= 500 || error.statusCode === 429;
	}

	if (error instanceof HttpServiceParsingError) {
		return false;
	}

	return true;
};

export async function runWithRetryAsync<TResult>(data: {
	readonly funcAsync: () => Promise<TResult>;
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly retryAttempt: number;
	readonly url: string;
	readonly requestHeaders: readonly Header[];
	readonly method: HttpMethod;
}): Promise<TResult> {
	try {
		return await data.funcAsync();
	} catch (error) {
		const newRetryAttempt = data.retryAttempt + 1;

		const retryResult = getRetryResult({
			error: error instanceof CoreSdkError ? error.originalError : error,
			responseHeaders: error instanceof HttpServiceInvalidResponseError ? error.responseHeaders : [],
			retryAttempt: data.retryAttempt,
			options: data.retryStrategyOptions,
		});

		if (!retryResult.canRetry) {
			const errorMessage = getDefaultErrorMessage({
				url: data.url,
				retryAttempts: data.retryAttempt,
				error: error,
				method: data.method,
			});

			throw new CoreSdkError(
				errorMessage,
				{
					url: data.url,
					retryAttempt: data.retryAttempt,
					retryStrategyOptions: data.retryStrategyOptions,
					requestHeaders: data.requestHeaders,
				},
				error instanceof CoreSdkError ? error.originalError : error,
			);
		}

		logRetryAttempt(data.retryStrategyOptions, newRetryAttempt, data.url);

		await waitAsync(retryResult.retryInMs);

		return await runWithRetryAsync({
			funcAsync: data.funcAsync,
			retryStrategyOptions: data.retryStrategyOptions,
			retryAttempt: newRetryAttempt,
			url: data.url,
			requestHeaders: data.requestHeaders,
			method: data.method,
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

function logRetryAttempt(opts: Pick<RetryStrategyOptions, 'logRetryAttempt'>, retryAttempt: number, url: string): void {
	if (opts.logRetryAttempt) {
		opts.logRetryAttempt(retryAttempt, url);
	}
}

function waitAsync(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
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

	return getRetryFromHeader({ options, responseHeaders });
}

function getRetryFromHeader({
	options,
	responseHeaders,
}: { readonly options: Required<RetryStrategyOptions>; readonly responseHeaders: readonly Header[] }): RetryResult {
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
