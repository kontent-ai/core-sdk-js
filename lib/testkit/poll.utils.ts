import { sleep } from "../utils/core.utils.js";
import type { Failure, Success } from "../utils/try-catch.utils.js";

const defaultIntervalMs = 1000;
const defaultTimeoutMs = 30000;

export async function poll<TResult, TError = unknown>(
	func: () => Promise<Success<TResult> | Failure<TResult, TError>>,
	config?: {
		readonly intervalMs?: number;
		readonly timeoutMs?: number;
	},
): Promise<Success<TResult> | Failure<TResult, TError>> {
	const intervalMs = config?.intervalMs ?? defaultIntervalMs;
	const timeoutMs = config?.timeoutMs ?? defaultTimeoutMs;
	const startTime = Date.now();

	let elapsedMs = 0;
	let latestAttempt: Success<TResult> | Failure<TResult, TError> | undefined;

	while (elapsedMs < timeoutMs) {
		const result = await func();
		latestAttempt = result;

		if (result.success) {
			return result;
		}

		await sleep(intervalMs);
		elapsedMs = Date.now() - startTime;
	}

	if (!latestAttempt) {
		throw new Error("Invalid latest attempt in poll result");
	}

	return latestAttempt;
}
