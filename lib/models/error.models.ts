import { match, P } from "ts-pattern";
import type { ZodError } from "zod";
import type { AdapterResponse, HttpServiceStatus, RequestBody, ResponseType } from "../http/http.models.js";
import type { SuccessfulHttpResponse } from "../sdk/sdk-models.js";
import type { KontentErrorResponseData, RetryStrategyOptions } from "./core.models.js";

export type ErrorReason =
	| "unauthorized"
	| "invalidResponse"
	| "invalidUrl"
	| "unknown"
	| "invalidBody"
	| "notFound"
	| "validationFailed"
	| "noResponses";

export type ErrorReasonData =
	| ReasonData<"unauthorized", ErrorWithKontentErrorResponse>
	| ReasonData<"invalidResponse", ErrorWithKontentErrorResponse>
	| ReasonData<"notFound", ErrorWithKontentErrorResponse>
	| ReasonData<"invalidBody", ErrorWithOriginalError>
	| ReasonData<"invalidUrl", ErrorWithOriginalError>
	| ReasonData<"unknown", ErrorWithOriginalError>
	| ReasonData<
			"validationFailed",
			{
				readonly zodError: ZodError;
				readonly response: SuccessfulHttpResponse<ResponseType, RequestBody>;
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

type ReasonData<TReason extends ErrorReason, TData> = {
	readonly reason: TReason;
} & TData;

function getErrorMessage(error: SdkErrorDetails): string {
	return match(error)
		.returnType<string>()
		.with(
			{ reason: P.union("invalidResponse", "notFound"), kontentErrorResponse: P.nonNullable },
			(m) => `${m.message} ${m.kontentErrorResponse.message}`,
		)
		.otherwise(() => error.message);
}
