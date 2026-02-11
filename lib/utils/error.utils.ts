import type { AdapterResponse } from "../http/http.models.js";
import type { HttpMethod, KontentErrorResponseData, KontentValidationError } from "../models/core.models.js";
import { SdkError, type SdkErrorDetails } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { isNotUndefined } from "./core.utils.js";

export function createSdkError(details: SdkErrorDetails): SdkError {
	return new SdkError(details);
}

export function isKontent404Error(error: SdkError): boolean {
	return error.details.reason === "invalidResponse" && error.details.status === 404;
}

export function getErrorMessage({
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
	const details = kontentErrorResponse ? getKontentErrorResponseMessage(adapterResponse, kontentErrorResponse) : undefined;
	return `Failed to execute '${method}' request '${url}'.${details ? ` ${details}` : ""}`;
}

/**
 * Checks if the given JSON value is a Kontent API error response data.
 */
export function isKontentErrorResponseData(json: JsonValue): json is KontentErrorResponseData {
	if (!json) {
		return false;
	}

	if (
		json instanceof Object &&
		("message" satisfies keyof KontentErrorResponseData) in json &&
		("request_id" satisfies keyof KontentErrorResponseData) in json &&
		("error_code" satisfies keyof KontentErrorResponseData) in json
	) {
		return true;
	}

	return false;
}

function getValidationErrorMessage(validationErrors?: readonly KontentValidationError[]): string | undefined {
	if (!validationErrors?.length) {
		return undefined;
	}
	return validationErrors
		.map((m) => {
			const details: readonly string[] = [
				m.path ? `path: ${m.path}` : undefined,
				m.line ? `line: ${m.line}` : undefined,
				m.position ? `position: ${m.position}` : undefined,
			].filter(isNotUndefined);
			return `${m.message}${details.length ? ` (${details.join(", ")})` : ""}`;
		})
		.join(", ");
}

function getKontentErrorResponseMessage(adapterResponse: AdapterResponse, kontentErrorResponse: KontentErrorResponseData): string {
	const validationErrorMessage = getValidationErrorMessage(kontentErrorResponse.validation_errors);
	return `Response failed with status '${adapterResponse.status}' and status text '${adapterResponse.statusText}'.${kontentErrorResponse.message}${validationErrorMessage ? ` ${validationErrorMessage}` : ""}`;
}
