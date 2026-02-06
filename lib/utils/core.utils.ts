export function isNotUndefined<T>(value: T): value is NonNullable<T> {
	return value !== undefined;
}

export async function sleepAsync(ms: number): Promise<void> {
	return await new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}
