/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type z from "zod";
import type { ZodType } from "zod";
import type { AdapterPayload, AdapterResponse, HttpRequestBody, HttpResponse, HttpService, PaginationConfig } from "../http/http.models.js";
import type { Header, HttpMethod, SdkInfo } from "../models/core.models.js";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { PickStringLiteral } from "../models/utility.types.js";
import type { Failure, Success, TryCatchResult } from "../utils/try-catch.utils.js";

export type QueryResponseMeta<TMeta> = Pick<AdapterResponse<AdapterPayload>, "status" | "responseHeaders" | "url"> & TMeta;

export type QueryResponse<TResponsePayload extends JsonValue, TMeta, TExtraProps> = {
	readonly payload: TResponsePayload;
	readonly meta: QueryResponseMeta<TMeta>;
} & TExtraProps;

export type BaseUrl = {
	readonly protocol: "https" | "http";
	readonly host: string;
};

export type SdkConfig<TExtendedConfig = unknown> = {
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
} & TExtendedConfig;

export type Query<TResponsePayload extends JsonValue, TError> = {
	readonly schema: z.ZodType<TResponsePayload>;
	readonly inspect: () => TryCatchResult<QueryInspection, TError>;
};

export type FetchQuery<TResponsePayload extends JsonValue, TMeta, TExtraProps, TError> = Query<TResponsePayload, TError> & {
	fetchSafe(): Promise<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TError>>;
	fetch(): Promise<QueryResponse<TResponsePayload, TMeta, TExtraProps>>;
};

export type PagedFetchQuery<TResponsePayload extends JsonValue, TMeta, TExtraProps, TPagingExtraProps, TError> = Query<
	TResponsePayload,
	TError
> & {
	fetchPageSafe(): Promise<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TError>>;
	fetchPage(): Promise<QueryResponse<TResponsePayload, TMeta, TExtraProps>>;
	fetchAllPagesSafe(
		config?: PaginationConfig,
	): Promise<SafePagingQueryResult<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TPagingExtraProps, TError>>;
	fetchAllPages(
		config?: PaginationConfig,
	): Promise<PagingQueryResponse<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TPagingExtraProps>>;
	pagesSafe(config?: PaginationConfig): AsyncGenerator<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TError>>;
	pages(config?: PaginationConfig): AsyncGenerator<QueryResponse<TResponsePayload, TMeta, TExtraProps>>;
};

export type MutationQuery<TResponsePayload extends JsonValue, TMeta, TExtraProps, TError> = Query<TResponsePayload, TError> & {
	executeSafe(): Promise<SafeQueryResponse<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TError>>;
	execute(): Promise<QueryResponse<TResponsePayload, TMeta, TExtraProps>>;
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

export type SuccessfulHttpResponse<TResponsePayload extends AdapterPayload, TRequestBody extends HttpRequestBody> = Extract<
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

export type SafePagingQueryResult<TResponsePayload, TExtraProps, TError> =
	| Success<
			{
				readonly responses: readonly TResponsePayload[];
				readonly partialResponses?: never;
			} & TExtraProps
	  >
	| Failure<
			{
				readonly responses?: never;
				readonly partialResponses: readonly TResponsePayload[];
			} & { [K in keyof TExtraProps]: never },
			TError
	  >;

export type PagingQueryResponse<TResponsePayload, TExtraProps> = {
	readonly responses: readonly TResponsePayload[];
	readonly test?: unknown;
} & TExtraProps;

export type ResolveQueryResult<TResponsePayload extends JsonValue, TMeta, TExtraProps, TError> = Promise<
	SafeQueryResponse<QueryResponse<TResponsePayload, TMeta, TExtraProps>, TError>
>;

export type FetchQueryRequest<TResponsePayload extends JsonValue, TMeta, TExtraProps, TError> = Pick<
	QueryInputData<TResponsePayload, null, TMeta, TExtraProps, TError>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal" | "mapError" | "mapExtraResponseProps"
> &
	RequestDataWithoutBody;

export type MutationQueryRequest<
	TResponsePayload extends JsonValue,
	TRequestBody extends HttpRequestBody,
	TMeta,
	TExtraProps,
	TError,
> = Pick<
	QueryInputData<TResponsePayload, TRequestBody, TMeta, TExtraProps, TError>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal" | "mapError" | "mapExtraResponseProps"
> & { readonly method: MutationHttpMethod } & RequestData<TRequestBody>;

export type QueryInputData<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TExtraProps, TError> = {
	readonly method: HttpMethod;
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly sdkInfo: SdkInfo;
	readonly abortSignal?: AbortSignal | undefined;
	readonly url: string | URL;
	readonly body: TRequestBody;
	readonly requestHeaders?: readonly Header[];
	readonly continuationToken?: string | undefined;
	readonly authorizationApiKey?: string | undefined;
} & MetadataMapperConfig<TResponsePayload, TRequestBody, TMeta> &
	ExtraResponsePropsMapper<TResponsePayload, TRequestBody, TExtraProps> &
	ErrorMapper<TError>;

export type PagingQueryInputData<
	TResponsePayload extends JsonValue,
	TRequestBody extends HttpRequestBody,
	TMeta,
	TExtraProps,
	TPagingExtraProps,
	TError,
> = QueryInputData<TResponsePayload, TRequestBody, TMeta, TExtraProps, TError> & {
	readonly mapPagingExtraResponseProps: (responses: readonly QueryResponse<TResponsePayload, TMeta, TExtraProps>[]) => TPagingExtraProps;
};

export type QueryInspection = Pick<
	ResolvedQueryData<JsonValue, HttpRequestBody, unknown, unknown, unknown>,
	"url" | "requestHeaders" | "body" | "method"
>;

export type ResolvedQueryData<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TExtraProps, TError> = {
	readonly url: URL;
	readonly requestHeaders: readonly Header[];
	readonly httpService: HttpService;
	readonly body: TRequestBody;
	readonly method: HttpMethod;
	readonly abortSignal?: AbortSignal | undefined;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly responseValidation: SdkConfig["responseValidation"];
} & MetadataMapperConfig<TResponsePayload, TRequestBody, TMeta> &
	ExtraResponsePropsMapper<TResponsePayload, TRequestBody, TExtraProps> &
	ErrorMapper<TError>;

type MetadataMapperConfig<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta> = {
	readonly mapMetadata: MetadataMapper<TResponsePayload, TRequestBody, TMeta>;
};

type ExtraResponsePropsMapper<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TExtraProps> = {
	readonly mapExtraResponseProps: (response: HttpResponse<TResponsePayload, TRequestBody>["response"]) => TExtraProps;
};

type ErrorMapper<TError> = {
	readonly mapError: (error: KontentSdkError) => TError;
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
