import { match, P } from "ts-pattern";
import type { ZodError } from "zod";
import type { AdapterResponse, HttpServiceStatus, RequestBody, ResponseData } from "../http/http.models.js";
import type { SuccessfulHttpResponse } from "../sdk/sdk-models.js";
import type { ErrorResponseData, ResolvedRetryStrategyOptions } from "./core.models.js";

export type ErrorReason = ErrorDetails["reason"];

export type ErrorDetails =
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

export interface BaseErrorData {
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
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions | undefined;

	/**
	 * The number of times the request has been retried.
	 */
	readonly retryAttempt: number | undefined;
}

export class KontentSdkError extends Error implements BaseErrorData {
	readonly details: ErrorDetails;
	readonly url: string;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions | undefined;
	readonly retryAttempt: number | undefined;

	constructor({
		baseErrorData: { message, url, retryStrategyOptions, retryAttempt },
		details,
	}: {
		readonly baseErrorData: BaseErrorData;
		readonly details: ErrorDetails;
	}) {
		super(getErrorMessage(message, details));

		this.message = message;
		this.url = url;
		this.retryStrategyOptions = retryStrategyOptions;
		this.retryAttempt = retryAttempt;
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

function getErrorMessage(message: string, error: ErrorDetails): string {
	return match(error)
		.returnType<string>()
		.with(
			{ reason: P.union("invalidResponse", "notFound"), kontentErrorResponse: P.nonNullable },
			(m) => `${message} ${m.kontentErrorResponse.message}`,
		)
		.otherwise(() => message);
}
