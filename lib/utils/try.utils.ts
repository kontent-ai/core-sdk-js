type Success<TData> = {
	readonly success: true;
	readonly data: TData;
	readonly error?: never;
};

type Failure<TError = unknown> = {
	readonly success: false;
	readonly data?: never;
	readonly error: TError;
};

export type Result<TData, TError = unknown> = Success<TData> | Failure<TError>;

export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
	try {
		const data = await fn();
		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

export function tryCatch<T>(fn: () => T): Result<T> {
	try {
		return { success: true, data: fn() };
	} catch (error) {
		return { success: false, error };
	}
}
