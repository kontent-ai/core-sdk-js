import { type ZodError, z } from "zod";
import type { AdapterPayload, AdapterResponse, HttpPayload, HttpRequestBody } from "../http/http.models.js";
import type { SuccessfulHttpResponse } from "../sdk/sdk-models.js";
import { toFriendlyKontentSdkErrorMessage } from "../utils/error.utils.js";
import type { ResolvedRetryStrategyOptions } from "./core.models.js";

export const validationErrorSchema = z.object({
	message: z.string(),
	path: z.string().optional(),
	line: z.number().optional(),
	position: z.number().optional(),
});

export type ValidationError = z.infer<typeof validationErrorSchema>;

export const errorResponseDataSchema = z.object({
	message: z.string(),
	request_id: z.string(),
	error_code: z.number(),
	validation_errors: z.array(validationErrorSchema).optional(),
});

export type ErrorResponseData = z.infer<typeof errorResponseDataSchema>;

export type ErrorReason = ErrorDetails["reason"];

export type ErrorDetails =
	| ReasonData<"adapterError", ErrorWithOriginalError>
	| ReasonData<"unauthorized", ErrorWithKontentResponse>
	| ReasonData<"invalidResponse", ErrorWithKontentResponse>
	| ReasonData<"parseError", ErrorWithOriginalError>
	| ReasonData<"notFound", ErrorWithKontentResponse>
	| ReasonData<"invalidBody", ErrorWithOriginalError>
	| ReasonData<"invalidUrl", ErrorWithOriginalError>
	| ReasonData<"aborted", ErrorWithOriginalError>
	| ReasonData<
			"validationFailed",
			{
				readonly zodError: ZodError;
				readonly response: SuccessfulHttpResponse<HttpPayload, HttpRequestBody>;
				readonly url: string;
			}
	  >;

export type BaseErrorData = {
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
};

export class KontentSdkError<TDetails extends ErrorDetails = ErrorDetails> extends Error implements BaseErrorData {
	readonly details: TDetails;
	readonly url: string;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions | undefined;
	readonly retryAttempt: number | undefined;

	constructor({
		baseErrorData: { message, url, retryStrategyOptions, retryAttempt },
		details,
	}: {
		readonly baseErrorData: BaseErrorData;
		readonly details: TDetails;
	}) {
		super(toFriendlyKontentSdkErrorMessage(message, details));

		this.url = url;
		this.retryStrategyOptions = retryStrategyOptions;
		this.retryAttempt = retryAttempt;
		this.details = details;
	}
}

/**
 * Http adapter should throw this error when the request is aborted.
 *
 * The error is then handled by the HttpService and converted to a KontentSdkError with the reason "aborted".
 */
export class AdapterAbortError extends Error {
	readonly details: unknown;
	constructor({ message, error }: { readonly message: string; readonly error?: unknown }) {
		super(message, { cause: error });
		this.details = error;
	}
}

/**
 * Http adapter should throw this error when the response is not valid JSON or BLOB.
 *
 * The error is then handled by the HttpService and converted to a KontentSdkError with the reason "parseError".
 */
export class AdapterParseError extends Error {
	readonly details: unknown;

	constructor({ message, error }: { readonly message: string; readonly error?: unknown }) {
		super(message, { cause: error });
		this.details = error;
	}
}

export type ErrorDetailsFor<TReason extends ErrorReason> = Extract<ErrorDetails, { readonly reason: TReason }>;

type ErrorWithKontentResponse = {
	readonly kontentErrorResponse: ErrorResponseData | undefined;
} & Pick<AdapterResponse<AdapterPayload>, "responseHeaders" | "status" | "statusText">;

type ErrorWithOriginalError = {
	readonly originalError: unknown;
};

type ReasonData<TReason extends ErrorReason, TData> = {
	readonly reason: TReason;
} & TData;
