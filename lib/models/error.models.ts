import type { StandardSchemaV1 } from "@standard-schema/spec";
import { match, P } from "ts-pattern";
import type { AdapterPayload, AdapterResponse } from "../http/http.models.js";
import type { ResolvedRetryStrategyOptions } from "./core.models.js";
import type { JsonValue } from "./json.models.js";

export type ValidationError = {
	readonly message: string;
	readonly path?: string | undefined;
	readonly line?: number | undefined;
	readonly position?: number | undefined;
};

export type ErrorResponseData = {
	readonly message: string;
	readonly request_id: string;
	readonly error_code: number;
	readonly validation_errors?: readonly ValidationError[] | undefined;
};

export type ErrorReason = ErrorDetails["reason"];

export type ErrorDetails =
	| ReasonData<"adapterError", ErrorWithOriginalError>
	| ReasonData<"transformError", ErrorWithOriginalError>
	| ReasonData<"unauthorized", ErrorWithKontentResponse>
	| ReasonData<"invalidResponse", ErrorWithKontentResponse>
	| ReasonData<"invalidResponseBody", ErrorWithOriginalError>
	| ReasonData<"notFound", ErrorWithKontentResponse>
	| ReasonData<"invalidBody", ErrorWithOriginalError>
	| ReasonData<"invalidUrl", ErrorWithOriginalError>
	| ReasonData<"aborted", ErrorWithOriginalError>
	| ReasonData<
			"schemaMismatch",
			{
				readonly issues: readonly StandardSchemaV1.Issue[];
				readonly payload: JsonValue;
				readonly url: URL;
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

/**
 * The retry state of the request an error belongs to.
 */
export type RetryContext = Pick<BaseErrorData, "retryStrategyOptions" | "retryAttempt">;

/**
 * Brands identify SDK errors even when they come from a different copy / version of this package
 * (e.g. Delivery and Management SDKs each bundling their own core SDK), where `instanceof` fails.
 * `Symbol.for` returns the same symbol across copies.
 */
export const kontentAiErrorBrands = {
	sdkError: Symbol.for("kontentAi.KontentSdkError"),
	adapterAbortError: Symbol.for("kontentAi.AdapterAbortError"),
	adapterParseError: Symbol.for("kontentAi.AdapterParseError"),
} as const;

export class KontentSdkError<TDetails extends ErrorDetails = ErrorDetails> extends Error implements BaseErrorData {
	override readonly name = "KontentSdkError";
	readonly [kontentAiErrorBrands.sdkError] = true;
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
		super(message, getErrorOptions(details));

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
	override readonly name = "AdapterAbortError";
	readonly [kontentAiErrorBrands.adapterAbortError] = true;

	constructor({ message, error }: { readonly message: string; readonly error?: unknown }) {
		super(message, { cause: error });
	}
}

/**
 * Http adapter should throw this error when the response is not valid JSON or BLOB.
 *
 * The error is then handled by the HttpService and converted to a KontentSdkError with the reason "invalidResponseBody".
 */
export class AdapterParseError extends Error {
	override readonly name = "AdapterParseError";
	readonly [kontentAiErrorBrands.adapterParseError] = true;

	constructor({ message, error }: { readonly message: string; readonly error?: unknown }) {
		super(message, { cause: error });
	}
}

export type ErrorDetailsFor<TReason extends ErrorReason> = Extract<ErrorDetails, { readonly reason: TReason }>;

type ErrorWithKontentResponse = {
	readonly kontentErrorResponse: ErrorResponseData | undefined;
	readonly adapterResponse: AdapterResponse<AdapterPayload>;
};

type ErrorWithOriginalError = {
	readonly originalError: unknown;
};

type ReasonData<TReason extends ErrorReason, TData> = {
	readonly reason: TReason;
} & TData;

/**
 * Exposes the underlying error as the standard `cause` so that it shows up in Node.js / browser console output
 * and in error trackers. The typed access path remains `details`, narrowed by `details.reason`.
 */
function getErrorOptions(details: ErrorDetails): ErrorOptions | undefined {
	return match(details)
		.returnType<ErrorOptions | undefined>()
		.with({ originalError: P.nonNullable }, (m) => ({ cause: m.originalError }))
		.with({ reason: "schemaMismatch" }, (m) => ({ cause: m.issues }))
		.otherwise(() => undefined);
}
