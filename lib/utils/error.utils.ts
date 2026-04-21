import { match, P } from "ts-pattern";
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
	return error instanceof KontentSdkError;
}

export function isAdapterParseError(error: unknown): error is AdapterParseError {
	return error instanceof AdapterParseError;
}

export function isAdapterAbortError(error: unknown): error is AdapterAbortError {
	return error instanceof AdapterAbortError;
}

export function toInvalidResponseMessage({
	method,
	url,
	adapterResponse,
	kontentErrorData: kontentErrorResponse,
}: {
	readonly url: URL;
	readonly method: HttpMethod;
	readonly adapterResponse: AdapterResponse<AdapterPayload>;
	readonly kontentErrorData: ErrorResponseData | undefined;
}): string {
	const details = kontentErrorResponse ? ` ${getKontentErrorResponseMessage(adapterResponse, kontentErrorResponse)}` : "";
	return `Failed to execute '${method}' request '${url.toString()}'.${details}`;
}

/**
 * Checks if the given JSON value is a Kontent API error response data.
 */
export function isKontentErrorResponseData(json: unknown): json is ErrorResponseData {
	if (!json || typeof json !== "object" || Array.isArray(json)) {
		return false;
	}
	return errorResponseDataSchema.safeParse(json).success;
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

export function toFriendlyKontentSdkErrorMessage(message: string, error: ErrorDetails): string {
	return match(error)
		.returnType<string>()
		.with(
			{ reason: P.union("invalidResponse", "notFound"), kontentErrorResponse: P.nonNullable },
			(m) => `${message} ${m.kontentErrorResponse.message}`,
		)
		.otherwise(() => message);
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
	return `Request failed with status '${adapterResponse.status}' and status text '${adapterResponse.statusText}'. ${kontentErrorResponse.message}${validationErrorMessage ? ` ${validationErrorMessage}` : ""}`;
}
