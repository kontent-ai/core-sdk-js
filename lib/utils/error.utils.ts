import type { HttpMethod, KontentValidationError } from '../models/core.models.js';
import { CoreSdkError, HttpServiceInvalidResponseError, HttpServiceParsingError } from '../models/error.models.js';
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

export function isCoreSdkError(error: unknown): error is CoreSdkError {
	return error instanceof CoreSdkError;
}

export function isCoreSdkInvalidResponseError(error: unknown): error is CoreSdkError<HttpServiceInvalidResponseError> {
	return isCoreSdkError(error) && isInvalidResponseError(error.originalError);
}

export function isCoreSdkParsingError(error: unknown): error is CoreSdkError<HttpServiceParsingError> {
	return isCoreSdkError(error) && isParsingError(error.originalError);
}

export function isKontent404Error(error: unknown): error is CoreSdkError<HttpServiceInvalidResponseError<404>> {
	return isCoreSdkInvalidResponseError(error) && error.originalError.adapterResponse.status === 404;
}

export function isInvalidResponseError(error: unknown): error is HttpServiceInvalidResponseError {
	return error instanceof HttpServiceInvalidResponseError;
}

export function isParsingError(error: unknown): error is HttpServiceParsingError {
	return error instanceof HttpServiceParsingError;
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
	if (isParsingError(error)) {
		return error.message;
	}

	if (isInvalidResponseError(error)) {
		const validationErrorMessage = getValidationErrorMessage(error.kontentErrorResponse?.validation_errors);
		return `Response failed with status '${error.adapterResponse.status}' and status text '${error.adapterResponse.statusText}'.${error.kontentErrorResponse ? ` ${error.kontentErrorResponse.message}` : ''}${validationErrorMessage ? ` ${validationErrorMessage}` : ''}`;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return undefined;
}
