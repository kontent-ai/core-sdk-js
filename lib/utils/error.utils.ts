import type { AdapterResponse } from '../http/http.models.js';
import type { HttpMethod, KontentErrorResponseData, KontentValidationError } from '../models/core.models.js';
import { isNotUndefined } from './core.utils.js';

export function getDefaultErrorMessage({
	method,
	url,
	adapterResponse,
	kontentErrorResponse,
}: {
	readonly url: string;
	readonly method: HttpMethod;
	readonly adapterResponse: AdapterResponse;
	readonly kontentErrorResponse?: KontentErrorResponseData;
}): string {
	const errorMessage = extractMessageFromError(adapterResponse, kontentErrorResponse);
	return `Failed to execute '${method}' request '${url}'.${errorMessage ? ` ${errorMessage}` : ''}`;
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

function extractMessageFromError(adapterResponse: AdapterResponse, kontentErrorResponse?: KontentErrorResponseData): string | undefined {
	if (kontentErrorResponse) {
		const validationErrorMessage = getValidationErrorMessage(kontentErrorResponse.validation_errors);
		return `Response failed with status '${adapterResponse.status}' and status text '${adapterResponse.statusText}'.${kontentErrorResponse ? ` ${kontentErrorResponse.message}` : ''}${validationErrorMessage ? ` ${validationErrorMessage}` : ''}`;
	}

	return undefined;
}
