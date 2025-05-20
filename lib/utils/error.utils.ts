import { type HttpMethod, HttpServiceInvalidResponseError, HttpServiceParsingError, type KontentValidationError } from '../models/core.models.js';
import { isNotUndefined } from './core.utils.js';

export function getDefaultErrorMessage({
	method,
	url,
	retryAttempts,
	error,
}: {
	readonly url: string;
	readonly retryAttempts: number;
	readonly error: unknown;
	readonly method: HttpMethod;
}): string {
	const errorMessage = extractMessageFromError(error);
	return `Failed to execute '${method}' request '${url}' after '${retryAttempts}' attempts.${errorMessage ? ` ${errorMessage}` : ''}`;
}

function getValidationErrorMessage(validationErrors?: readonly KontentValidationError[]): string | undefined {
	if (!validationErrors || !validationErrors.length) {
		return undefined;
	}
	return validationErrors
		.map((m) => {
			const details: readonly string[] = [
				m.path ? `path: ${m.path}` : undefined,
				m.line ? `line: ${m.line}` : undefined,
				m.position ? `position: ${m.position}` : undefined,
			].filter(isNotUndefined);
			return `${m.message}${details.length ? ` (${details.join(', ')})` : ''}`;
		})
		.join(', ');
}

function extractMessageFromError(error: unknown): string | undefined {
	if (error instanceof HttpServiceParsingError) {
		return error.message;
	}

	if (error instanceof HttpServiceInvalidResponseError) {
		const validationErrorMessage = getValidationErrorMessage(error.kontentErrorResponse?.validation_errors);
		return `Response failed with status '${error.statusCode}' and status text '${error.statusText}'.${error.kontentErrorResponse ? ` ${error.kontentErrorResponse.message}` : ''}${validationErrorMessage ? ` ${validationErrorMessage}` : ''}`;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return undefined;
}
