import type { AdapterPayload, AdapterResponse } from "../http/http.models.js";
import type { ErrorResponseData, HttpMethod, ValidationError } from "../models/core.models.js";
import { type BaseErrorData, type ErrorDetails, KontentSdkError } from "../models/error.models.js";
import { isDefined } from "./core.utils.js";

export function createSdkError({
	baseErrorData,
	details,
}: {
	readonly baseErrorData: BaseErrorData;
	readonly details: ErrorDetails;
}): KontentSdkError {
	return new KontentSdkError({
		baseErrorData,
		details,
	});
}

export function isKontent404Error(error: unknown): boolean {
	return isKontentSdkError(error) && error.details.reason === "notFound";
}

export function isKontentSdkError(error: unknown): error is KontentSdkError {
	return error instanceof KontentSdkError;
}

export function toInvalidResponseMessage({
	method,
	url,
	adapterResponse,
	kontentErrorResponse,
}: {
	readonly url: string;
	readonly method: HttpMethod;
	readonly adapterResponse: AdapterResponse<AdapterPayload>;
	readonly kontentErrorResponse?: ErrorResponseData;
}): string {
	const details = kontentErrorResponse ? getKontentErrorResponseMessage(adapterResponse, kontentErrorResponse) : undefined;
	return `Failed to execute '${method}' request '${url}'.${details ? ` ${details}` : ""}`;
}

/**
 * Checks if the given JSON value is a Kontent API error response data.
 */
export function isKontentErrorResponseData(json: unknown): json is ErrorResponseData {
	if (!json) {
		return false;
	}

	if (
		json instanceof Object &&
		("message" satisfies keyof ErrorResponseData) in json &&
		("request_id" satisfies keyof ErrorResponseData) in json &&
		("error_code" satisfies keyof ErrorResponseData) in json
	) {
		return true;
	}

	return false;
}

function getValidationErrorMessage(validationErrors?: readonly ValidationError[]): string | undefined {
	if (!validationErrors?.length) {
		return undefined;
	}
	return validationErrors
		.map((m) => {
			const details: readonly string[] = [
				m.path ? `path: ${m.path}` : undefined,
				m.line ? `line: ${m.line}` : undefined,
				m.position ? `position: ${m.position}` : undefined,
			].filter(isDefined);
			return `${m.message}${details.length ? ` (${details.join(", ")})` : ""}`;
		})
		.join(", ");
}

function getKontentErrorResponseMessage(adapterResponse: AdapterResponse<AdapterPayload>, kontentErrorResponse: ErrorResponseData): string {
	const validationErrorMessage = getValidationErrorMessage(kontentErrorResponse.validation_errors);
	return `Request failed with status '${adapterResponse.status}' and status text '${adapterResponse.statusText}'.${kontentErrorResponse.message}${validationErrorMessage ? ` ${validationErrorMessage}` : ""}`;
}
