export type Success<TData> = {
	readonly success: true;
	readonly error?: never;
} & TData;

export type Failure<TData, TError = unknown> = {
	readonly success: false;
	readonly error: TError;
} & TData;

export type TryCatchResult<TData, TError = unknown> = Success<{ readonly data: TData }> | Failure<{ readonly data?: never }, TError>;

export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<TryCatchResult<T>> {
	try {
		const data = await fn();
		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

export function tryCatch<T>(fn: () => T): TryCatchResult<T> {
	try {
		return { success: true, data: fn() };
	} catch (error) {
		return { success: false, error };
	}
}
