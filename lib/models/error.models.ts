import type { AdapterResponse, HttpServiceStatus } from "../http/http.models.js";
import type { KontentErrorResponseData, RetryStrategyOptions } from "./core.models.js";

export type ErrorReason = "invalidResponse" | "invalidUrl" | "unknown" | "invalidBody" | "notFound";

export type CoreSdkErrorDetails<TReason extends ErrorReason = ErrorReason> = (
	| Details<
			"invalidResponse",
			{
				readonly kontentErrorResponse: KontentErrorResponseData | undefined;
			} & Pick<AdapterResponse<HttpServiceStatus>, "isValidResponse" | "responseHeaders" | "status" | "statusText">
	  >
	| Details<
			"notFound",
			{
				readonly kontentErrorResponse: KontentErrorResponseData | undefined;
			} & Pick<AdapterResponse<404>, "isValidResponse" | "responseHeaders" | "status" | "statusText">
	  >
	| Details<
			"invalidBody",
			{
				readonly originalError: unknown;
			}
	  >
	| Details<
			"invalidUrl",
			{
				readonly originalError: unknown;
			}
	  >
	| Details<
			"unknown",
			{
				readonly originalError: unknown;
			}
	  >
) & {
	readonly reason: TReason;
};

export type CoreSdkError<TReason extends ErrorReason = ErrorReason> = {
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
} & CoreSdkErrorDetails<TReason>;

type Details<TReason extends ErrorReason, TDetails> = {
	readonly reason: TReason;
} & TDetails;
