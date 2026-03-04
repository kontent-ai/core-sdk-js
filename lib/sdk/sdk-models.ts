/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import z from "zod";
import type { AdapterResponse, HttpResponse, HttpService, PaginationConfig, RequestBody, ResponseData } from "../http/http.models.js";
import type { KontentSdkError } from "../models/error.models.js";
import type { Failure, Success } from "../utils/try-catch.utils.js";

export type QueryResponseMeta<TMeta = unknown> = Pick<AdapterResponse, "status" | "responseHeaders" | "url"> & {
	readonly continuationToken: string | undefined;
} & TMeta;

export type QueryResponse<TResponsePayload, TMeta = unknown> = {
	readonly payload: TResponsePayload;
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

export type Query<TResponsePayload, TMeta> = {
	schema: z.ZodType<TResponsePayload>;
	toUrl(): string;
	toPromise(): Promise<QueryResult<QueryResponse<TResponsePayload, TMeta>>>;
};

export type PagingQuery<TResponsePayload, TMeta> = Query<TResponsePayload, TMeta> & {
	toAllPromise(config?: PaginationConfig): Promise<PagingQueryResult<QueryResponse<TResponsePayload, TMeta>>>;
	pages(config?: PaginationConfig): AsyncGenerator<QueryResult<QueryResponse<TResponsePayload, TMeta>>>;
};

export type NextPageStateWithRequest =
	| {
			readonly pageSource: "continuationToken";
			readonly hasNextPage: true;
			readonly continuationToken: string;
			readonly nextPageUrl?: never;
	  }
	| {
			readonly pageSource: "nextPageUrl";
			readonly hasNextPage: true;
			readonly continuationToken?: never;
			readonly nextPageUrl: string;
	  }
	| {
			readonly pageSource: "firstRequest";
			readonly hasNextPage: true;
			readonly continuationToken?: never;
			readonly nextPageUrl?: never;
	  };

export type SuccessfulHttpResponse<TResponsePayload extends ResponseData, TRequestBody extends RequestBody> = Extract<
	HttpResponse<TResponsePayload, TRequestBody>,
	{ readonly success: true }
>["response"];

/**
 * Result type that represents a success or failure of an operation.
 *
 * Ensures that consumers of this library handle both success and failure cases.
 */
export type QueryResult<TResponsePayload> =
	| Success<{ readonly response: TResponsePayload }>
	| Failure<{ readonly response?: never }, KontentSdkError>;

export type PagingQueryResult<TResponsePayload> =
	| Success<{
			readonly responses: readonly TResponsePayload[];
			readonly partialResponses?: never;
			readonly lastContinuationToken: string | undefined;
	  }>
	| Failure<
			{
				readonly responses?: never;
				readonly lastContinuationToken?: never;
				readonly partialResponses: readonly TResponsePayload[];
			},
			KontentSdkError
	  >;

export const nilUuid = "00000000-0000-0000-0000-000000000000";

export const kontentUuidSchema = z.union([z.uuid({ version: "v4" }), z.literal(nilUuid)]);
