import { match, P } from "ts-pattern";
import type { ZodError } from "zod";
import type { AdapterResponse, HttpServiceStatus, RequestBody, ResponseData } from "../http/http.models.js";
import type { SuccessfulHttpResponse } from "../sdk/sdk-models.js";
import type { ErrorResponseData, RetryStrategyOptions } from "./core.models.js";

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
	| ReasonData<"unauthorized", ErrorWithKontentResponse>
	| ReasonData<"invalidResponse", ErrorWithKontentResponse>
	| ReasonData<"notFound", ErrorWithKontentResponse>
	| ReasonData<"invalidBody", ErrorWithOriginalError>
	| ReasonData<"invalidUrl", ErrorWithOriginalError>
	| ReasonData<"unknown", ErrorWithOriginalError>
	| ReasonData<
			"validationFailed",
			{
				readonly zodError: ZodError;
				readonly response: SuccessfulHttpResponse<ResponseData, RequestBody>;
				readonly url: string;
			}
	  >
	| ReasonData<
			"noResponses",
			{
				readonly url: string;
			}
	  >;

export type ErrorDetails = {
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
	readonly retryStrategyOptions: Required<RetryStrategyOptions> | undefined;

	/**
	 * The number of times the request has been retried.
	 */
	readonly retryAttempt: number | undefined;
} & ErrorReasonData;

export class KontentSdkError extends Error {
	readonly details: ErrorDetails;

	constructor(details: ErrorDetails) {
		super(getErrorMessage(details));

		this.details = details;
	}
}

type ErrorWithKontentResponse = {
	readonly kontentErrorResponse: ErrorResponseData | undefined;
} & Pick<AdapterResponse<HttpServiceStatus>, "isValidResponse" | "responseHeaders" | "status" | "statusText">;

type ErrorWithOriginalError = {
	readonly originalError: unknown;
};

type ReasonData<TReason extends ErrorReason, TData> = {
	readonly reason: TReason;
} & TData;

function getErrorMessage(error: ErrorDetails): string {
	return match(error)
		.returnType<string>()
		.with(
			{ reason: P.union("invalidResponse", "notFound"), kontentErrorResponse: P.nonNullable },
			(m) => `${m.message} ${m.kontentErrorResponse.message}`,
		)
		.otherwise(() => error.message);
}
