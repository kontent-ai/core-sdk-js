import type { ZodError } from "zod";
import type { AdapterResponse, HttpServiceStatus } from "../http/http.models.js";
import type { SdkResponse, SuccessfulHttpResponse } from "../sdk/sdk-models.js";
import type { KontentErrorResponseData, RetryStrategyOptions } from "./core.models.js";
import type { JsonValue } from "./json.models.js";

export type ErrorReason =
	| "invalidContinuationToken"
	| "invalidResponse"
	| "invalidUrl"
	| "unknown"
	| "invalidBody"
	| "notFound"
	| "validationFailed"
	| "noResponses";

export type ErrorReasonData =
	| ReasonData<"invalidResponse", ErrorWithKontentErrorResponse>
	| ReasonData<"notFound", ErrorWithKontentErrorResponse>
	| ReasonData<"invalidContinuationToken", ErrorWithSdkResponse>
	| ReasonData<"invalidBody", ErrorWithOriginalError>
	| ReasonData<"invalidUrl", ErrorWithOriginalError>
	| ReasonData<"unknown", ErrorWithOriginalError>
	| ReasonData<
			"validationFailed",
			{
				readonly zodError: ZodError;
				readonly response: SuccessfulHttpResponse<JsonValue, JsonValue>;
				readonly url: string;
			}
	  >
	| ReasonData<
			"noResponses",
			{
				readonly url: string;
			}
	  >;

export type SdkErrorDetails = {
	/**
	 * The message of the error
	 */
	readonly message: string;

	/**
	 * The URL of the request.
	 */
	readonly url: string;

	/**
	 * Used retry strategy.
	 */
	readonly retryStrategyOptions?: Required<RetryStrategyOptions>;

	/**
	 * The number of times the request has been retried.
	 */
	readonly retryAttempt?: number;
} & ErrorReasonData;

export class SdkError extends Error {
	readonly details: SdkErrorDetails;

	constructor(details: SdkErrorDetails) {
		super(getErrorMessage(details));

		this.details = details;
	}
}

type ErrorWithKontentErrorResponse = {
	readonly kontentErrorResponse: KontentErrorResponseData | undefined;
} & Pick<AdapterResponse<HttpServiceStatus>, "isValidResponse" | "responseHeaders" | "status" | "statusText">;

type ErrorWithOriginalError = {
	readonly originalError: unknown;
};

type ErrorWithSdkResponse = {
	readonly response: SdkResponse<unknown, unknown>;
};

type ReasonData<TReason extends ErrorReason, TData> = {
	readonly reason: TReason;
} & TData;

function getErrorMessage(error: SdkErrorDetails): string {
	if ((error.reason === "invalidResponse" || error.reason === "notFound") && error.kontentErrorResponse) {
		return `${error.message} ${error.kontentErrorResponse.message}`;
	}
	return error.message;
}
