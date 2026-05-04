import { match, P } from "ts-pattern";
import type { AdapterPayload, HttpRequestBody, HttpResponse } from "../http/http.models.js";
import type { ResolvedRetryStrategyOptions, RetryStrategyOptions } from "../models/core.models.js";
import type { ErrorDetailsFor, KontentSdkError } from "../models/error.models.js";
import { runWithAbortSignal } from "./abort.utils.js";
import { sleep } from "./core.utils.js";
import { createSdkError } from "./error.utils.js";
import { getRetryAfterHeaderValue } from "./header.utils.js";

type RetryResult =
	| {
			readonly canRetry: false;
			readonly error: KontentSdkError;
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

export async function runWithRetry<TPayload extends AdapterPayload, TBody extends HttpRequestBody>(data: {
	readonly func: (retryAttempt: number) => Promise<HttpResponse<TPayload, TBody>>;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly retryAttempt: number;
	readonly url: URL;
	readonly abortSignal: AbortSignal | undefined;
}): Promise<HttpResponse<TPayload, TBody>> {
	let retryAttempt = data.retryAttempt;
	let retryResult: RetryResult = { canRetry: true, retryInMs: 0 };

	while (retryResult.canRetry) {
		const { success, response, error } = await data.func(retryAttempt);

		if (success) {
			return { success: true, response: response };
		}

		retryResult = getRetryResult({ error, retryAttempt, retryStrategyOptions: data.retryStrategyOptions });

		if (retryResult.canRetry) {
			// wait before the next retry or if the abort signal is aborted, return the error
			const { isAborted } = await waitBeforeNextRetry({ retryInMs: retryResult.retryInMs, abortSignal: data.abortSignal });
			if (isAborted) {
				return {
					success: false,
					error: createAbortError({ url: data.url, retryStrategyOptions: data.retryStrategyOptions, retryAttempt }),
				};
			}

			retryAttempt += 1;

			// log retry attempt when available
			data.retryStrategyOptions.logRetryAttempt?.(retryAttempt, data.url.toString());
		}
	}

	return {
		success: false,
		error: retryResult.error,
	};
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
	readonly url: URL;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly retryAttempt: number;
}): KontentSdkError<ErrorDetailsFor<"aborted">> {
	return createSdkError({
		baseErrorData: {
			message: "The request was aborted while waiting before the next retry attempt.",
			url: url.toString(),
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
	return await runWithAbortSignal<void>({
		func: async () => {
			return await sleep(retryInMs);
		},
		abortSignal,
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
			error,
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
						"aborted",
						"parseError",
					),
				},
			},
			() => false,
		)
		.with({ details: { reason: "adapterError" } }, (m) => {
			return canRetryAdapterError(m);
		})
		.exhaustive();
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
