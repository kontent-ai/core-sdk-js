export function isNonEmptyArray<T>(array: readonly T[]): array is [T, ...T[]] {
	return array.length > 0;
}
