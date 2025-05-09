export function getDefaultErrorMessage({
	url,
	retryAttempts,
	status,
	error,
}: {
	readonly error: unknown;
	readonly url: string;
	readonly retryAttempts: number;
	readonly status: number | undefined;
}): string {
	const errorMessage = extractErrorMessage(error);

	return `Failed to execute request '${url}' after '${retryAttempts}' attempts${status ? ` with status '${status}'` : ''}${errorMessage ? `: ${errorMessage}` : ''}`;
}

export function extractErrorMessage(error: unknown): string | undefined {
	if (error instanceof Error) {
		return error.message;
	}
	return undefined;
}
