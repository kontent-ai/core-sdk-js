/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type z from "zod";
import type { ZodType } from "zod";
import type {
	AdapterPayload,
	AdapterResponse,
	HttpPayload,
	HttpRequestBody,
	HttpResponse,
	HttpService,
	PaginationConfig,
} from "../http/http.models.js";
import type { Header, HttpMethod, SDKInfo } from "../models/core.models.js";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { PickStringLiteral } from "../models/utility.types.js";
import type { Failure, Success, TryCatchResult } from "../utils/try-catch.utils.js";

export type QueryResponseMeta<TMeta> = Pick<AdapterResponse<AdapterPayload>, "status" | "responseHeaders" | "url"> & {
	readonly continuationToken: string | undefined;
} & TMeta;

export type QueryResponse<TResponsePayload extends JsonValue, TMeta> = {
	readonly payload: TResponsePayload;
	readonly meta: QueryResponseMeta<TMeta>;
};

export type BaseUrl = `${"https" | "http"}://${string}`;

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
	readonly baseUrl?: BaseUrl;

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

export type Query<TResponsePayload extends JsonValue, TError> = {
	readonly schema: z.ZodType<TResponsePayload>;
	readonly inspect: () => TryCatchResult<QueryInspection, TError>;
};

export type FetchQuery<TResponsePayload extends JsonValue, TMeta, TError> = Query<TResponsePayload, TError> & {
	fetchSafe(): Promise<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta>, TError>>;
	fetch(): Promise<QueryResponse<TResponsePayload, TMeta>>;
};

export type PagedFetchQuery<TResponsePayload extends JsonValue, TMeta, TError> = Query<TResponsePayload, TError> & {
	fetchPageSafe(): Promise<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta>, TError>>;
	fetchPage(): Promise<QueryResponse<TResponsePayload, TMeta>>;
	fetchAllPagesSafe(config?: PaginationConfig): Promise<SafePagingQueryResult<QueryResponse<TResponsePayload, TMeta>, TError>>;
	fetchAllPages(config?: PaginationConfig): Promise<PagingQueryResponse<QueryResponse<TResponsePayload, TMeta>>>;
	pagesSafe(config?: PaginationConfig): AsyncGenerator<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta>, TError>>;
	pages(config?: PaginationConfig): AsyncGenerator<QueryResponse<TResponsePayload, TMeta>>;
};

export type MutationQuery<TResponsePayload extends JsonValue, TMeta, TError> = Query<TResponsePayload, TError> & {
	executeSafe(): Promise<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta>, TError>>;
	execute(): Promise<QueryResponse<TResponsePayload, TMeta>>;
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

export type SuccessfulHttpResponse<TResponsePayload extends HttpPayload, TRequestBody extends HttpRequestBody> = Extract<
	HttpResponse<TResponsePayload, TRequestBody>,
	{ readonly success: true }
>["response"];

/**
 * Result type that represents a success or failure of an operation.
 *
 * Ensures that consumers of this library handle both success and failure cases.
 */
export type SafeQueryResponse<TResponsePayload, TError> =
	| Success<{ readonly response: TResponsePayload }>
	| Failure<{ readonly response?: never }, TError>;

export type SafePagingQueryResult<TResponsePayload, TError> =
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
			TError
	  >;

export type PagingQueryResponse<TResponsePayload> = {
	readonly responses: readonly TResponsePayload[];
	readonly lastContinuationToken: string | undefined;
};

export type ResolveQueryResult<TResponsePayload extends JsonValue, TMeta, TError> = Promise<
	SafeQueryResponse<QueryResponse<TResponsePayload, TMeta>, TError>
>;

export type FetchQueryRequest<TResponsePayload extends JsonValue, TMeta, TError> = Pick<
	QueryInputData<TResponsePayload, null, TMeta, TError>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal" | "mapError"
> &
	RequestDataWithoutBody;

export type MutationQueryRequest<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError> = Pick<
	QueryInputData<TResponsePayload, TRequestBody, TMeta, TError>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal" | "mapError"
> & { readonly method: MutationHttpMethod } & RequestData<TRequestBody>;

export type QueryInputData<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError> = {
	readonly method: HttpMethod;
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly sdkInfo: SDKInfo;
	readonly abortSignal?: AbortSignal | undefined;
	readonly url: string | URL;
	readonly body: TRequestBody;
	readonly requestHeaders?: readonly Header[];
	readonly continuationToken?: string | undefined;
	readonly authorizationApiKey?: string | undefined;
	readonly mapError: (error: KontentSdkError) => TError;
} & MetadataMapperConfig<TResponsePayload, TRequestBody, TMeta>;

export type QueryInspection = Pick<
	ResolvedQueryData<JsonValue, HttpRequestBody, unknown, unknown>,
	"url" | "requestHeaders" | "body" | "method"
>;

export type ResolvedQueryData<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError> = {
	readonly url: URL;
	readonly requestHeaders: readonly Header[];
	readonly httpService: HttpService;
	readonly body: TRequestBody;
	readonly method: HttpMethod;
	readonly abortSignal?: AbortSignal | undefined;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly responseValidation: SdkConfig["responseValidation"];
	readonly mapError: (error: KontentSdkError) => TError;
} & MetadataMapperConfig<TResponsePayload, TRequestBody, TMeta>;

type MetadataMapperConfig<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = {
	readonly mapMetadata: MetadataMapper<TResponsePayload, TRequestBody, TMeta>;
};

type MetadataMapper<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = (
	response: SuccessfulHttpResponse<TResponsePayload, TRequestBody>,
	data: MetadataContextData,
) => TMeta;

type MetadataContextData = {
	readonly continuationToken: string | undefined;
};

type RequestData<TRequestBody extends HttpRequestBody> = {
	readonly url: string | URL;
	readonly body: TRequestBody;
	readonly requestHeaders?: readonly Header[];
	readonly continuationToken?: string | undefined;
	readonly authorizationApiKey?: string | undefined;
};

type MutationHttpMethod = PickStringLiteral<HttpMethod, "POST" | "PUT" | "PATCH" | "DELETE">;

type RequestDataWithoutBody = Omit<RequestData<null>, "body">;
