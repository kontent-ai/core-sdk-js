import { match, P } from "ts-pattern";
import type { HttpResponse, RequestBody, ResponseData } from "../http/http.models.js";
import type { Header, HttpMethod, RetryStrategyOptions } from "../models/core.models.js";
import type { SdkError } from "../models/error.models.js";
import { sleepAsync } from "./core.utils.js";
import { createSdkError } from "./error.utils.js";
import { getRetryAfterHeaderValue } from "./header.utils.js";

type RetryResult =
	| {
			readonly canRetry: false;
	  }
	| {
			readonly canRetry: true;
			readonly retryInMs: number;
	  };

const defaultMaxRetries: NonNullable<RetryStrategyOptions["maxRetries"]> = 3;
const getDefaultDelayBetweenRetriesMs: NonNullable<RetryStrategyOptions["getDelayBetweenRetriesMs"]> = (error) => {
	return match(error)
		.returnType<number>()
		.with({ details: { reason: "invalidResponse" } }, () => getRetryMsFromHeaders({ error }))
		.otherwise(() => 0);
};
const defaultCanRetryError: NonNullable<RetryStrategyOptions["canRetryError"]> = (error) => {
	return match(error)
		.returnType<boolean>()
		.with({ details: { reason: "invalidResponse" } }, (m) => {
			if (m.details.kontentErrorResponse) {
				// The request is clearly invalid as we got an error response from the API
				return false;
			}

			return m.details.status >= 500 || m.details.status === 429;
		})
		.otherwise(() => true);
};

export async function runWithRetryAsync<TResponse extends ResponseData, TRequestBody extends RequestBody>(data: {
	readonly funcAsync: () => Promise<HttpResponse<TResponse, TRequestBody>>;
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly retryAttempt: number;
	readonly url: string;
	readonly requestHeaders: readonly Header[];
	readonly method: HttpMethod;
}): Promise<HttpResponse<TResponse, TRequestBody>> {
	const { success, response, error } = await data.funcAsync();

	if (success) {
		return {
			success: true,
			response,
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
			error: createSdkError({
				...error.details,
				retryAttempt: data.retryAttempt,
				retryStrategyOptions: data.retryStrategyOptions,
			}),
		};
	}

	logRetryAttempt(data.retryStrategyOptions, newRetryAttempt, data.url);

	await sleepAsync(retryResult.retryInMs);

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
	const maxRetries: number = options?.maxRetries ?? defaultMaxRetries;

	return {
		maxRetries: maxRetries,
		canRetryError: options?.canRetryError ?? defaultCanRetryError,
		getDelayBetweenRetriesMs: options?.getDelayBetweenRetriesMs ?? getDefaultDelayBetweenRetriesMs,
		logRetryAttempt:
			options?.logRetryAttempt === false
				? false
				: (attempt, url) => {
						if (options?.logRetryAttempt) {
							options.logRetryAttempt(attempt, url);
						} else {
							console.warn(getDefaultRetryAttemptLogMessage(attempt, maxRetries, url));
						}
					},
	};
}

export function getDefaultRetryAttemptLogMessage(retryAttempt: number, maxRetries: number, url: string): string {
	return `Retry attempt '${retryAttempt}' from a maximum of '${maxRetries}' retries. Requested url: '${url}'`;
}

function logRetryAttempt(opts: Pick<RetryStrategyOptions, "logRetryAttempt">, retryAttempt: number, url: string): void {
	if (opts.logRetryAttempt) {
		opts.logRetryAttempt(retryAttempt, url);
	}
}

function getRetryResult({
	retryAttempt,
	error,
	options,
}: {
	readonly retryAttempt: number;
	readonly error: SdkError;
	readonly options: Required<RetryStrategyOptions>;
}): RetryResult {
	return match({ retryAttempt, options, error })
		.returnType<RetryResult>()
		.when(
			(m) => m.retryAttempt >= m.options.maxRetries,
			() => ({
				canRetry: false,
			}),
		)
		.when(
			(m) => !m.options.canRetryError(m.error),
			() => ({
				canRetry: false,
			}),
		)
		.otherwise((m) => ({
			canRetry: true,
			retryInMs: m.options.getDelayBetweenRetriesMs(m.error),
		}));
}

function getRetryMsFromHeaders({ error }: { readonly error: SdkError }): number {
	return match(error)
		.returnType<number>()
		.with({ details: { responseHeaders: P.nonNullable } }, (m) => {
			const retryAfterHeaderValue = getRetryAfterHeaderValue(m.details.responseHeaders);
			if (retryAfterHeaderValue) {
				return retryAfterHeaderValue * 1000;
			}
			return 0;
		})
		.otherwise(() => 0);
}
