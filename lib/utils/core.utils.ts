export function isNotUndefined<T>(value: T): value is NonNullable<T> {
	return value !== undefined;
}

export async function sleepAsync(ms: number): Promise<void> {
	return await new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
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
		(typeof record.arrayBuffer === "function" &&
			typeof record.text === "function" &&
			typeof record.stream === "function" &&
			typeof record.size === "number" &&
			typeof record.type === "string")
	);
}
