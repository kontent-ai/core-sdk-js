/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { AdapterResponse, HttpResponse, HttpService, RequestBody, ResponseData } from "../http/http.models.js";
import type { SdkError } from "../models/error.models.js";
import type { Prettify } from "../models/utility.models.js";

export type QueryResponseMeta<TMeta = unknown> = Pick<AdapterResponse, "status" | "responseHeaders" | "url"> & {
	readonly continuationToken?: string;
} & TMeta;

export type QueryResponse<TData, TMeta = unknown> = {
	readonly data: TData;
	readonly meta: QueryResponseMeta<TMeta>;
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
		 * When enabled, the response data will be validated against the expected Zod schema from which the types
		 * this library are based on. This ensures that you are working with the correct data types.
		 *
		 * @default false
		 */
		readonly enable: boolean;
	};
};

export type Query<TData, TMeta = unknown> = {
	toUrl(): string;
	toPromise(): Promise<QueryResult<QueryResponse<TData, TMeta>>>;
};

export type PagingQuery<TData, TMeta = unknown> = Query<TData, TMeta> & {
	toAllPromise(): Promise<PagingQueryResult<QueryResponse<TData, TMeta>>>;
};

export type SuccessfulHttpResponse<TResponseData extends ResponseData, TRequestBody extends RequestBody> = Prettify<
	Extract<HttpResponse<TResponseData, TRequestBody>, { readonly success: true }>["response"]
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
	| (Success & { readonly responses: TResponse[]; readonly lastContinuationToken: string | undefined })
	| (Failure & { readonly responses?: never; readonly lastContinuationToken?: never });

type Success = {
	readonly success: true;
	readonly error?: never;
};
type Failure = {
	readonly success: false;
	readonly error: SdkError;
};
