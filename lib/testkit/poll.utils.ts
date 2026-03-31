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

	let result = await func();

	while (!result.success && Date.now() - startTime <= timeoutMs) {
		await sleep(intervalMs);
		result = await func();
	}

	return result;
}
