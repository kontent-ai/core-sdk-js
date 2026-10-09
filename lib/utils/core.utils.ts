export function isDefined<T>(value: T): value is NonNullable<T> {
	return value !== undefined && value !== null;
}

const abortEventName = "abort";

/**
 * Resolves after `ms` milliseconds, or as soon as `abortSignal` is aborted.
 * The timer is cleared on abort so it does not keep the process alive.
 */
export async function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
	if (ms <= 0 || abortSignal?.aborted) {
		return;
	}

	return await new Promise<void>((resolve) => {
		const onAbort = () => {
			clearTimeout(timeoutId);
			resolve();
		};

		const timeoutId = setTimeout(() => {
			abortSignal?.removeEventListener(abortEventName, onAbort);
			resolve();
		}, ms);

		abortSignal?.addEventListener(abortEventName, onAbort, { once: true });
	});
}

export function isBlob(value: unknown): value is Blob {
	if (!value) {
		return false;
	}

	if (value instanceof Blob) {
		return true;
	}

	const record = value as Record<string, unknown>;

	return (
		Object.prototype.toString.call(value) === "[object Blob]" ||
		(typeof record.arrayBuffer === "function" && typeof record.size === "number")
	);
}
