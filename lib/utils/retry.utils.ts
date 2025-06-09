import type { HttpResponse } from "../http/http.models.js";
import type { Header, HttpMethod, RetryStrategyOptions } from "../models/core.models.js";
import type { CoreSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { getRetryAfterHeaderValue } from "./header.utils.js";

type RetryResult =
	| {
			readonly canRetry: false;
	  }
	| {
			readonly canRetry: true;
			readonly retryInMs: number;
	  };

const defaultMaxAttempts: NonNullable<RetryStrategyOptions["maxAttempts"]> = 3;
const defaultDelayBetweenAttemptsMs: NonNullable<RetryStrategyOptions["defaultDelayBetweenRequestsMs"]> = 1000;
const defaultCanRetryError: NonNullable<RetryStrategyOptions["canRetryError"]> = (error) => {
	if (error.details.type === "invalidResponse") {
		if (error.details.kontentErrorResponse) {
			// The request is clearly invalid as we got an error response from the API
			return false;
		}

		return error.details.status >= 500 || error.details.status === 429;
	}

	return true;
};

export async function runWithRetryAsync<TResponse extends JsonValue | Blob, TBodyData extends JsonValue | Blob>(data: {
	readonly funcAsync: () => Promise<HttpResponse<TResponse, TBodyData>>;
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly retryAttempt: number;
	readonly url: string;
	readonly requestHeaders: readonly Header[];
	readonly method: HttpMethod;
}): Promise<HttpResponse<TResponse, TBodyData>> {
	const { success, data: result, error } = await data.funcAsync();

	if (success) {
		return {
			success: true,
			data: result,
		};
	}

	const newRetryAttempt = data.retryAttempt + 1;

	const retryResult = getRetryResult({
		error,
		retryAttempt: data.retryAttempt,
		options: data.retryStrategyOptions,
	});

	if (!retryResult.canRetry) {
		return {
			success: false,
			error: {
				...error,
				retryAttempt: data.retryAttempt,
				retryStrategyOptions: data.retryStrategyOptions,
			},
		};
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

function logRetryAttempt(opts: Pick<RetryStrategyOptions, "logRetryAttempt">, retryAttempt: number, url: string): void {
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
}: {
	readonly retryAttempt: number;
	readonly error: CoreSdkError;
	readonly options: Required<RetryStrategyOptions>;
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

	return getRetryFromHeader({ options, error });
}

function getRetryFromHeader({ options, error }: { readonly options: Required<RetryStrategyOptions>; readonly error: CoreSdkError }): RetryResult {
	if (error.details.type !== "invalidResponse") {
		return {
			canRetry: false,
		};
	}

	const retryAfterHeaderValue = getRetryAfterHeaderValue(error.details.responseHeaders);

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
