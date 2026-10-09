import { match, P } from "ts-pattern";
import type { AdapterPayload, HttpRequestBody, HttpResponse } from "../http/http.models.js";
import type { ResolvedRetryStrategyOptions, RetryStrategyOptions } from "../models/core.models.js";
import { type ErrorDetailsFor, KontentSdkError } from "../models/error.models.js";
import { sleep } from "./core.utils.js";
import { getRetryAfterHeaderValue } from "./header.utils.js";

const defaultMaxRetries: NonNullable<RetryStrategyOptions["maxRetries"]> = 3;

const defaultCanRetryAdapterError: NonNullable<RetryStrategyOptions["canRetryAdapterError"]> = () => false;

export async function runWithRetry<TPayload extends AdapterPayload, TBody extends HttpRequestBody>(data: {
	readonly func: (retryAttempt: number) => Promise<HttpResponse<TPayload, TBody>>;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly url: URL;
	readonly abortSignal: AbortSignal | undefined;
}): Promise<HttpResponse<TPayload, TBody>> {
	const runRequest = async (retryAttempt: number): Promise<HttpResponse<TPayload, TBody>> => {
		const { success, response, error } = await data.func(retryAttempt);

		if (success) {
			return { success: true, response: response };
		}

		if (!canRetryError({ error, retryAttempt, retryStrategyOptions: data.retryStrategyOptions })) {
			return { success: false, error };
		}

		const retryInMs = data.retryStrategyOptions.getDelayBetweenRetriesMs(error);

		// wait before the next retry or if the abort signal is aborted, return the error
		await sleep(retryInMs, data.abortSignal);
		if (data.abortSignal?.aborted) {
			return {
				success: false,
				error: createAbortError({ url: data.url, retryStrategyOptions: data.retryStrategyOptions, retryAttempt }),
			};
		}

		// log retry attempt when available
		data.retryStrategyOptions.logRetryAttempt?.(retryAttempt + 1, data.url.toString(), retryInMs);

		return await runRequest(retryAttempt + 1);
	};

	return await runRequest(0);
}

export function resolveDefaultRetryStrategyOptions(options?: RetryStrategyOptions): ResolvedRetryStrategyOptions {
	const maxRetries: number = options?.maxRetries ?? defaultMaxRetries;
	const maxRetryDelayMs = options?.maxRetryDelayMs;

	return {
		maxRetries: maxRetries,
		getDelayBetweenRetriesMs: (error) => {
			const delayMs = getRetryMsFromHeaders({ error });
			return maxRetryDelayMs === undefined ? delayMs : Math.min(delayMs, maxRetryDelayMs);
		},
		canRetryAdapterError: options?.canRetryAdapterError ?? defaultCanRetryAdapterError,
		logRetryAttempt: match(options?.logRetryAttempt)
			.returnType<ResolvedRetryStrategyOptions["logRetryAttempt"]>()
			.with("logToConsole", () => (retryAttempt, url, retryInMs) => {
				console.warn(getDefaultRetryAttemptLogMessage(retryAttempt, maxRetries, url, retryInMs));
			})
			.otherwise((m) => m),
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
	return new KontentSdkError({
		baseErrorData: {
			message: "The request was aborted while waiting before the next retry attempt.",
			url: url.toString(),
			retryStrategyOptions,
			retryAttempt,
		},
		details: { reason: "aborted", originalError: undefined },
	});
}

function getDefaultRetryAttemptLogMessage(retryAttempt: number, maxRetries: number, url: string, retryInMs: number): string {
	return `Retry attempt '${retryAttempt}' from a maximum of '${maxRetries}' retries after waiting '${retryInMs}' ms. Requested url: '${url}'`;
}

function canRetryError({
	error,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly error: KontentSdkError;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): boolean {
	if (retryAttempt >= retryStrategyOptions.maxRetries) {
		return false;
	}

	return match(error)
		.returnType<boolean>()
		.with({ details: { adapterResponse: { status: 429 } } }, () => true)
		.with({ details: { kontentErrorResponse: P.nonNullable } }, () => {
			// The request is clearly invalid as we got an error response from the Kontent.ai API
			return false;
		})
		.with(
			{
				details: {
					reason: P.union(
						"invalidBody",
						"invalidResponse",
						"invalidUrl",
						"transformError",
						"notFound",
						"unauthorized",
						"schemaMismatch",
						"aborted",
						"invalidResponseBody",
					),
				},
			},
			() => false,
		)
		.with({ details: { reason: "adapterError" } }, (m) => {
			return retryStrategyOptions.canRetryAdapterError(m);
		})
		.exhaustive();
}

function getRetryMsFromHeaders({ error }: { readonly error: KontentSdkError }): number {
	return match(error)
		.returnType<number>()
		.with({ details: { adapterResponse: P.nonNullable } }, (m) => {
			const retryAfterHeaderValue = getRetryAfterHeaderValue(m.details.adapterResponse.responseHeaders);
			if (retryAfterHeaderValue) {
				return retryAfterHeaderValue * 1000;
			}
			return 0;
		})
		.otherwise(() => 0);
}
