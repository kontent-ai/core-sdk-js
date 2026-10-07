import type { AdapterPayload, AdapterResponse } from "../http/http.models.js";
import type { HttpMethod } from "../models/core.models.js";
import {
	AdapterAbortError,
	AdapterParseError,
	type BaseErrorData,
	type ErrorDetails,
	type ErrorResponseData,
	errorResponseDataSchema,
	KontentSdkError,
	kontentAiErrorBrands,
	type ValidationError,
} from "../models/error.models.js";

import { isDefined } from "./core.utils.js";

export function createSdkError<TDetails extends ErrorDetails>({
	baseErrorData,
	details,
}: {
	readonly baseErrorData: BaseErrorData;
	readonly details: TDetails;
}): KontentSdkError<TDetails> {
	return new KontentSdkError({
		baseErrorData,
		details,
	});
}

export function isKontent404Error(error: unknown): boolean {
	return isKontentSdkError(error) && error.details.reason === "notFound";
}

export function isKontentSdkError(error: unknown): error is KontentSdkError {
	return error instanceof KontentSdkError || hasBrand(error, kontentAiErrorBrands.sdkError);
}

export function isAdapterParseError(error: unknown): error is AdapterParseError {
	return error instanceof AdapterParseError || hasBrand(error, kontentAiErrorBrands.adapterParseError);
}

export function isAdapterAbortError(error: unknown): error is AdapterAbortError {
	return error instanceof AdapterAbortError || hasBrand(error, kontentAiErrorBrands.adapterAbortError);
}

export function toInvalidResponseMessage({
	method,
	adapterResponse,
	kontentErrorData: kontentErrorResponse,
}: {
	readonly method: HttpMethod;
	readonly adapterResponse: AdapterResponse<AdapterPayload>;
	readonly kontentErrorData: ErrorResponseData | undefined;
}): string {
	const kontentDetails = kontentErrorResponse ? ` ${getKontentErrorResponseMessage(kontentErrorResponse)}` : "";
	return `Failed to execute '${method}' request '${adapterResponse.url.toString()}'. Request failed with status '${adapterResponse.status}' and status text '${adapterResponse.statusText}'.${kontentDetails}`;
}

/**
 * Checks if the given JSON value is a Kontent API error response data.
 */
export function isKontentErrorResponseData(payload: unknown): payload is ErrorResponseData {
	return errorResponseDataSchema.safeParse(payload).success;
}

/**
 * Checks if the given error is a fetch abort error.
 */
export function isFetchAbortError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}
	return "name" in error && error.name === "AbortError";
}

function getValidationErrorMessage(validationErrors?: readonly ValidationError[]): string | undefined {
	if (!validationErrors?.length) {
		return undefined;
	}
	return validationErrors
		.map((m) => {
			const details: readonly string[] = [
				isDefined(m.path) ? `path: ${m.path}` : undefined,
				isDefined(m.line) ? `line: ${m.line}` : undefined,
				isDefined(m.position) ? `position: ${m.position}` : undefined,
			].filter(isDefined);
			return `${m.message}${details.length ? ` (${details.join(", ")})` : ""}`;
		})
		.join(", ");
}

function getKontentErrorResponseMessage(kontentErrorResponse: ErrorResponseData): string {
	const validationErrorMessage = getValidationErrorMessage(kontentErrorResponse.validation_errors);
	return `${kontentErrorResponse.message}${validationErrorMessage ? ` ${validationErrorMessage}` : ""}`;
}

function hasBrand(value: unknown, brand: symbol): boolean {
	return typeof value === "object" && value !== null && Reflect.get(value, brand) === true;
}
