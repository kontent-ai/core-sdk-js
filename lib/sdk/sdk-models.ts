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
import type { Failure, Success } from "../utils/try-catch.utils.js";

export type QueryResponseMeta<TMeta = unknown> = Pick<AdapterResponse<AdapterPayload>, "status" | "responseHeaders" | "url"> & {
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

export type Query<TResponsePayload> = {
	readonly schema: z.ZodType<TResponsePayload>;
	readonly url: string;
};

export type FetchQuery<TResponsePayload, TMeta> = Query<TResponsePayload> & {
	fetchSafe(): Promise<QueryResult<QueryResponse<TResponsePayload, TMeta>>>;
	fetch(): Promise<QueryResponse<TResponsePayload, TMeta>>;
};

export type PagedFetchQuery<TResponsePayload, TMeta> = Query<TResponsePayload> & {
	fetchPageSafe(): Promise<QueryResult<QueryResponse<TResponsePayload, TMeta>>>;
	fetchPage(): Promise<QueryResponse<TResponsePayload, TMeta>>;
	fetchAllPagesSafe(config?: PaginationConfig): Promise<SafePagingQueryResult<QueryResponse<TResponsePayload, TMeta>>>;
	fetchAllPages(config?: PaginationConfig): Promise<PagingQueryResult<QueryResponse<TResponsePayload, TMeta>>>;
	pagesSafe(config?: PaginationConfig): AsyncGenerator<QueryResult<QueryResponse<TResponsePayload, TMeta>>>;
	pages(config?: PaginationConfig): AsyncGenerator<QueryResponse<TResponsePayload, TMeta>>;
};

/**
 * Not yet implemented.
 *
 * @todo Implement mutation query.
 */
export type MutationQuery<TResponsePayload, TMeta> = Query<TResponsePayload> & {
	executeSafe(): Promise<QueryResult<QueryResponse<TResponsePayload, TMeta>>>;
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
export type QueryResult<TResponsePayload> =
	| Success<{ readonly response: TResponsePayload }>
	| Failure<{ readonly response?: never }, KontentSdkError>;

export type SafePagingQueryResult<TResponsePayload> =
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

export type PagingQueryResult<TResponsePayload> = {
	readonly responses: readonly TResponsePayload[];
	readonly lastContinuationToken: string | undefined;
};

export type QueryPromiseResult<TResponsePayload extends JsonValue, TMeta> = ReturnType<
	Pick<FetchQuery<TResponsePayload, TMeta>, "fetchSafe">["fetchSafe"]
>;

export type FetchQueryRequest<TResponsePayload extends JsonValue, TMeta> = Pick<
	ResolveQueryData<TResponsePayload, null, TMeta>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal"
> & { readonly request: RequestDataWithoutBody };

export type MutationQueryRequest<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = Pick<
	ResolveQueryData<TResponsePayload, TRequestBody, TMeta>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal" | "request"
> & { readonly method: MutationHttpMethod };

export type ResolveQueryData<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = {
	readonly method: HttpMethod;
	readonly request: RequestData<TRequestBody>;
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly sdkInfo: SDKInfo;
	readonly abortSignal?: AbortSignal | undefined;
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
	readonly url: string;
	readonly body: TRequestBody;
	readonly requestHeaders?: readonly Header[];
	readonly continuationToken?: string | undefined;
	readonly authorizationApiKey?: string | undefined;
};

type MutationHttpMethod = PickStringLiteral<HttpMethod, "POST" | "PUT" | "PATCH" | "DELETE">;

type RequestDataWithoutBody = Omit<RequestData<never>, "body">;
