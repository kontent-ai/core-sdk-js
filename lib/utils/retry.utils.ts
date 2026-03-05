import { match, P } from "ts-pattern";
import type { HttpResponse, RequestBody, ResponseData } from "../http/http.models.js";
import type { ResolvedRetryStrategyOptions, RetryStrategyOptions } from "../models/core.models.js";
import type { KontentSdkError } from "../models/error.models.js";
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

const defaultCanRetryUnhandledError: NonNullable<RetryStrategyOptions["canRetryUnhandledError"]> = (_error) => {
	return false;
};

export async function runWithRetryAsync<TResponse extends ResponseData, TRequestBody extends RequestBody>(data: {
	readonly funcAsync: (retryAttempt: number) => Promise<HttpResponse<TResponse, TRequestBody>>;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly retryAttempt: number;
	readonly url: string;
}): Promise<HttpResponse<TResponse, TRequestBody>> {
	const { success, response, error } = await data.funcAsync(data.retryAttempt);

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
		retryStrategyOptions: data.retryStrategyOptions,
	});

	if (!retryResult.canRetry) {
		return {
			success: false,
			error: createSdkError({
				baseErrorData: {
					message: error.message,
					url: error.url,
					retryStrategyOptions: data.retryStrategyOptions,
					retryAttempt: data.retryAttempt,
				},
				details: error.details,
			}),
		};
	}

	// log retry attempt when available
	data.retryStrategyOptions.logRetryAttempt?.(newRetryAttempt, data.url);

	// wait before the next retry
	await waitBeforeNextRetryAsync({ retryInMs: retryResult.retryInMs });

	return await runWithRetryAsync({
		funcAsync: data.funcAsync,
		retryStrategyOptions: data.retryStrategyOptions,
		retryAttempt: newRetryAttempt,
		url: data.url,
	});
}

export function resolveDefaultRetryStrategyOptions(options?: RetryStrategyOptions): ResolvedRetryStrategyOptions {
	const maxRetries: number = options?.maxRetries ?? defaultMaxRetries;

	const resolvedOptions: ResolvedRetryStrategyOptions = {
		maxRetries: maxRetries,
		canRetryUnhandledError: options?.canRetryUnhandledError ?? defaultCanRetryUnhandledError,
		getDelayBetweenRetriesMs: (error) => getRetryMsFromHeaders({ error }),
		logRetryAttempt: match(options?.logRetryAttempt)
			.returnType<ResolvedRetryStrategyOptions["logRetryAttempt"]>()
			.with("logToConsole", () => (retryAttempt, url) => {
				console.warn(getDefaultRetryAttemptLogMessage(retryAttempt, maxRetries, url));
			})
			.otherwise((m) => m),
	};

	return resolvedOptions;
}

async function waitBeforeNextRetryAsync({ retryInMs }: { readonly retryInMs: number }): Promise<void> {
	if (retryInMs <= 0) {
		return;
	}

	await sleepAsync(retryInMs);
}

function getDefaultRetryAttemptLogMessage(retryAttempt: number, maxRetries: number, url: string): string {
	return `Retry attempt '${retryAttempt}' from a maximum of '${maxRetries}' retries. Requested url: '${url}'`;
}

function getRetryResult({
	retryStrategyOptions,
	error,
	retryAttempt,
}: {
	readonly retryAttempt: number;
	readonly error: KontentSdkError;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): RetryResult {
	if (
		!canRetryError({
			retryAttempt,
			error,
			maxRetries: retryStrategyOptions.maxRetries,
			canRetryUnhandledError: retryStrategyOptions.canRetryUnhandledError,
		})
	) {
		return {
			canRetry: false,
		};
	}

	return {
		canRetry: true,
		retryInMs: retryStrategyOptions.getDelayBetweenRetriesMs(error),
	};
}

function canRetryError({
	retryAttempt,
	error,
	maxRetries,
	canRetryUnhandledError,
}: {
	readonly retryAttempt: number;
	readonly error: KontentSdkError;
	readonly maxRetries: Required<RetryStrategyOptions>["maxRetries"];
	readonly canRetryUnhandledError: NonNullable<RetryStrategyOptions["canRetryUnhandledError"]>;
}): boolean {
	return (
		match({ retryAttempt, error })
			.returnType<boolean>()
			// Order of the condition matters
			// First check if the retry attempt is greater than the maximum retries
			// Then all other cases
			.with({ retryAttempt: P.when((m) => m >= maxRetries) }, () => false)
			.with({ error: { details: { status: 429 } } }, () => {
				// Always retry 429 errors
				return true;
			})
			.with({ error: { details: { kontentErrorResponse: P.nonNullable } } }, () => {
				// The request is clearly invalid as we got an error response from the API
				// and we should not retry such requests
				return false;
			})
			.with({ error: { details: { reason: P.union("invalidBody", "invalidUrl", "notFound", "unauthorized") } } }, () => false)
			.otherwise(() => {
				return canRetryUnhandledError(error);
			})
	);
}

function getRetryMsFromHeaders({ error }: { readonly error: KontentSdkError }): number {
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
