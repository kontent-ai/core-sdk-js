import { match, P } from "ts-pattern";
import type { HttpPayload, HttpRequestBody, HttpResponse } from "../http/http.models.js";
import type { ResolvedRetryStrategyOptions, RetryStrategyOptions } from "../models/core.models.js";
import type { ErrorDetailsFor, ErrorReason, KontentSdkError } from "../models/error.models.js";
import { sleep } from "./core.utils.js";
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

type WaitResult = {
	readonly isAborted: boolean;
};

const defaultMaxRetries: NonNullable<RetryStrategyOptions["maxRetries"]> = 3;

const defaultCanRetryAdapterError: NonNullable<RetryStrategyOptions["canRetryAdapterError"]> = (_error) => {
	return false;
};

export async function runWithRetry<TResponse extends HttpPayload, TRequestBody extends HttpRequestBody>(data: {
	readonly func: (retryAttempt: number) => Promise<HttpResponse<TResponse, TRequestBody>>;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly retryAttempt: number;
	readonly url: string;
	readonly abortSignal: AbortSignal | undefined;
}): Promise<HttpResponse<TResponse, TRequestBody>> {
	const { success, response, error } = await data.func(data.retryAttempt);

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

	// wait before the next retry or if the abort signal is aborted, return the error
	const { isAborted } = await waitBeforeNextRetry({ retryInMs: retryResult.retryInMs, abortSignal: data.abortSignal });
	if (isAborted) {
		return {
			success: false,
			error: createAbortError({ url: data.url, retryStrategyOptions: data.retryStrategyOptions, retryAttempt: newRetryAttempt }),
		};
	}

	return await runWithRetry({
		func: data.func,
		retryStrategyOptions: data.retryStrategyOptions,
		retryAttempt: newRetryAttempt,
		url: data.url,
		abortSignal: data.abortSignal,
	});
}

export function resolveDefaultRetryStrategyOptions(options?: RetryStrategyOptions): ResolvedRetryStrategyOptions {
	const maxRetries: number = options?.maxRetries ?? defaultMaxRetries;

	const resolvedOptions: ResolvedRetryStrategyOptions = {
		maxRetries: maxRetries,
		getDelayBetweenRetriesMs: (error) => getRetryMsFromHeaders({ error }),
		canRetryAdapterError: options?.canRetryAdapterError ?? defaultCanRetryAdapterError,
		logRetryAttempt: match(options?.logRetryAttempt)
			.returnType<ResolvedRetryStrategyOptions["logRetryAttempt"]>()
			.with("logToConsole", () => (retryAttempt, url) => {
				console.warn(getDefaultRetryAttemptLogMessage(retryAttempt, maxRetries, url));
			})
			.otherwise((m) => m),
	};

	return resolvedOptions;
}

export async function waitBeforeNextRetry({
	retryInMs,
	abortSignal,
}: {
	readonly retryInMs: number;
	readonly abortSignal?: AbortSignal | undefined;
}): Promise<WaitResult> {
	if (abortSignal) {
		return await waitBeforeNextRetryWithAbortSignal({ retryInMs, abortSignal });
	}

	if (retryInMs <= 0) {
		return {
			isAborted: false,
		};
	}

	await sleep(retryInMs);
	return {
		isAborted: false,
	};
}

function createAbortError({
	url,
	retryStrategyOptions,
	retryAttempt,
}: {
	readonly url: string;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly retryAttempt: number;
}): KontentSdkError<ErrorDetailsFor<"aborted">> {
	return createSdkError({
		baseErrorData: {
			message: "The request was aborted while waiting before the next retry attempt.",
			url,
			retryStrategyOptions,
			retryAttempt,
		},
		details: { reason: "aborted", originalError: undefined },
	});
}

async function waitBeforeNextRetryWithAbortSignal({
	retryInMs,
	abortSignal,
}: {
	readonly retryInMs: number;
	readonly abortSignal: AbortSignal;
}): Promise<WaitResult> {
	if (abortSignal.aborted) {
		return {
			isAborted: true,
		};
	}

	const listenerName = "abort";

	return await new Promise<WaitResult>((resolve) => {
		const timeoutId = setTimeout((): void => {
			abortSignal?.removeEventListener(listenerName, onAbort);
			resolve({ isAborted: false });
		}, retryInMs);

		const onAbort = (): void => {
			clearTimeout(timeoutId);
			abortSignal?.removeEventListener(listenerName, onAbort);
			resolve({
				isAborted: true,
			});
		};

		abortSignal?.addEventListener(listenerName, onAbort, { once: true });
	});
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
			canRetryAdapterError: retryStrategyOptions.canRetryAdapterError,
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
	canRetryAdapterError,
}: {
	readonly retryAttempt: number;
	readonly error: KontentSdkError;
	readonly maxRetries: Required<RetryStrategyOptions>["maxRetries"];
	readonly canRetryAdapterError: NonNullable<RetryStrategyOptions["canRetryAdapterError"]>;
}): boolean {
	if (hasExceededMaxRetries({ retryAttempt, maxRetries })) {
		return false;
	}

	if (isRateLimitError({ error })) {
		return true;
	}

	return match(error)
		.returnType<boolean>()
		.with({ details: { kontentErrorResponse: P.nonNullable } }, () => {
			// The request is clearly invalid as we got an error response from the API
			// and we should not retry such requests
			return false;
		})
		.with(
			{
				details: {
					reason: P.union(
						"invalidBody",
						"invalidResponse",
						"invalidUrl",
						"notFound",
						"unauthorized",
						"validationFailed",
						"noResponses",
						"aborted",
					),
				},
			},
			() => false,
		)
		.with({ details: { reason: "adapterError" } }, (m) => {
			if (isErrorWithReason(m, m.details.reason)) {
				return canRetryAdapterError(m);
			}
			throw new Error("Failed to assert adapter error");
		})
		.exhaustive();
}

function isErrorWithReason<TReason extends ErrorReason>(
	error: KontentSdkError,
	reason: TReason,
): error is KontentSdkError<ErrorDetailsFor<TReason>> {
	return error.details.reason === reason;
}

function isRateLimitError({ error }: { readonly error: KontentSdkError }): boolean {
	return match(error)
		.returnType<boolean>()
		.with({ details: { status: 429 } }, () => true)
		.otherwise(() => false);
}

function hasExceededMaxRetries({ retryAttempt, maxRetries }: { readonly retryAttempt: number; readonly maxRetries: number }): boolean {
	return retryAttempt >= maxRetries;
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
