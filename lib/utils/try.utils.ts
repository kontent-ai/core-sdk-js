type Success<T> = {
	readonly success: true;
	readonly data: T;
	readonly error?: never;
};

type Failure = {
	readonly success: false;
	readonly data?: never;
	readonly error: unknown;
};

type Result<T> = Success<T> | Failure;

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
