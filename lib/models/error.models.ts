import type { AdapterResponse, HttpServiceStatus } from "../http/http.models.js";
import type { KontentErrorResponseData, RetryStrategyOptions } from "./core.models.js";

export type ErrorType = "invalidResponse" | "invalidUrl" | "unknown" | "invalidBody";

export type CoreSdkError = {
	/**
	 * The message of the error
	 */
	readonly message: string;

	/**
	 * The URL of the request.
	 */
	readonly url: string;

	/**
	 * Applied retry strategy.
	 */
	readonly retryStrategyOptions?: Required<RetryStrategyOptions>;

	/**
	 * The number of times the request has been retried.
	 */
	readonly retryAttempt?: number;

	/**
	 * The original error that caused the request to fail
	 */
	readonly details:
		| SdkErrorDetails<
				"invalidResponse",
				{
					readonly kontentErrorResponse: KontentErrorResponseData | undefined;
				} & Pick<AdapterResponse<HttpServiceStatus>, "isValidResponse" | "responseHeaders" | "status" | "statusText">
		  >
		| SdkErrorDetails<
				"invalidBody",
				{
					readonly error: unknown;
				}
		  >
		| SdkErrorDetails<
				"invalidUrl",
				{
					readonly error: unknown;
				}
		  >
		| SdkErrorDetails<
				"unknown",
				{
					readonly error: unknown;
				}
		  >;
};

type SdkErrorDetails<TType extends ErrorType, TDetails> = {
	readonly type: TType;
} & TDetails;
