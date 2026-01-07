/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { AdapterResponse, HttpResponse, HttpService } from "../http/http.models.js";
import type { SdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { Prettify } from "../models/utility.models.js";

export type SdkResponseMeta<TExtraMetadata = unknown> = Pick<AdapterResponse, "status" | "responseHeaders"> & {
	readonly continuationToken?: string;
} & TExtraMetadata;

export type SdkResponse<TPayload, TExtraMetadata = unknown> = {
	readonly payload: TPayload;
	readonly meta: SdkResponseMeta<TExtraMetadata>;
};

export type SdkConfig = {
	/**
	 * The HTTP service to use for the request. If not provided, the default HTTP service will be used.
	 *
	 * You may provide your own HTTP service implementation to customize the request behavior.
	 *
	 * See https://github.com/kontent-ai/core-sdk-js for more information regarding the HTTP service customization.
	 */
	readonly httpService?: HttpService;

	/**
	 * The base URL to use for the request. If not provided, the default base URL will be used.
	 *
	 * If provided, it will override the default base URL based on selected API mode.
	 */
	readonly baseUrl?: string;

	/**
	 * Configuration for response validation.
	 */
	readonly responseValidation?: {
		/**
		 * When enabled, the response payload will be validated against the expected Zod schema from which the types
		 * this library are based on. This ensures that you are working with the correct data types.
		 *
		 * @default false
		 */
		readonly enable: boolean;
	};
};

export type Query<TPayload, TExtraData = unknown> = {
	toUrl(): string;
	toPromise(): Promise<QueryResult<SdkResponse<TPayload, TExtraData>>>;
};

export type PagingQuery<TPayload, TExtraData = unknown> = Query<TPayload, TExtraData> & {
	toAllPromise(): Promise<PagingQueryResult<SdkResponse<TPayload, TExtraData>>>;
};

export type SuccessfulHttpResponse<TPayload extends JsonValue, TBodyData extends JsonValue> = Prettify<
	Extract<HttpResponse<TPayload, TBodyData>, { readonly success: true }>["response"]
>;

export type ResultOfSuccessfulQuery<TQuery extends Query<unknown>> = Extract<
	Awaited<ReturnType<TQuery["toPromise"]>>,
	{ readonly success: true }
>["response"];

/**
 * A nomadic result type that represents a success or failure of an operation.
 *
 * Ensures that consumers of this library handle both success and failure cases.
 */
export type QueryResult<TResponse> = (Success & { readonly response: TResponse }) | (Failure & { readonly response?: never });
export type PagingQueryResult<TResponse> =
	| (Success & { readonly responses: TResponse[]; readonly lastContinuationToken: string })
	| (Failure & { readonly responses?: never; readonly lastContinuationToken?: never });

type Success = {
	readonly success: true;
	readonly error?: never;
};
type Failure = {
	readonly success: false;
	readonly error: SdkError;
};
