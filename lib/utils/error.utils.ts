import type { AdapterResponse } from "../http/http.models.js";
import type { HttpMethod, KontentErrorResponseData, KontentValidationError } from "../models/core.models.js";
import type { CoreSdkError, ErrorReason } from "../models/error.models.js";
import { isNotUndefined } from "./core.utils.js";

export function isKontent404Error(error: CoreSdkError): error is CoreSdkError<"invalidResponse"> {
	return isErrorOfType("invalidResponse", error) && error.status === 404;
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

function isErrorOfType<TReason extends ErrorReason>(reason: TReason, error: CoreSdkError): error is CoreSdkError<TReason> {
	return error.reason === reason;
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
