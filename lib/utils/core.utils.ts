export function isNotUndefined<T>(value: T): value is NonNullable<T> {
	return value !== undefined;
}
