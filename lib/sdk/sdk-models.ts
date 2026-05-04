/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type z from "zod";
import type { ZodType } from "zod";
import type { AdapterPayload, AdapterResponse, HttpRequestBody, HttpResponse, HttpService, PagingConfig } from "../http/http.models.js";
import type { Header, HttpMethod, SdkInfo } from "../models/core.models.js";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { PickStringLiteral } from "../models/utility.types.js";
import type { Failure, Success, TryCatchResult } from "../utils/try-catch.utils.js";

export type QueryResponseMeta<TMeta> = Pick<AdapterResponse<AdapterPayload>, "status" | "responseHeaders" | "url"> & TMeta;

export type QueryResponse<TPayload extends JsonValue, TMeta = unknown, TExtra = unknown> = {
	readonly payload: TPayload;
	readonly meta: QueryResponseMeta<TMeta>;
} & TExtra;

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

export type Query<TPayload extends JsonValue, TError = KontentSdkError> = {
	readonly schema: z.ZodType<TPayload>;
	readonly inspect: () => TryCatchResult<QueryInspection, TError>;
};

export type FetchQuery<TPayload extends JsonValue, TError = KontentSdkError, TMeta = unknown, TExtra = unknown> = Query<
	TPayload,
	TError
> & {
	fetchSafe(): Promise<SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	fetch(): Promise<QueryResponse<TPayload, TMeta, TExtra>>;
};

export type PagedFetchQuery<
	TPayload extends JsonValue,
	TError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
	TPagingExtra = unknown,
> = Query<TPayload, TError> & {
	fetchPageSafe(): Promise<SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	fetchPage(): Promise<QueryResponse<TPayload, TMeta, TExtra>>;
	fetchAllPagesSafe(config?: PagingConfig): Promise<SafePagingQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError, TPagingExtra>>;
	fetchAllPages(config?: PagingConfig): Promise<PagingQueryResponse<QueryResponse<TPayload, TMeta, TExtra>, TPagingExtra>>;
	pagesSafe(config?: PagingConfig): AsyncGenerator<SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	pages(config?: PagingConfig): AsyncGenerator<QueryResponse<TPayload, TMeta, TExtra>>;
};

export type MutationQuery<TPayload extends JsonValue, TError = KontentSdkError, TMeta = unknown, TExtra = unknown> = Query<
	TPayload,
	TError
> & {
	executeSafe(): Promise<SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	execute(): Promise<QueryResponse<TPayload, TMeta, TExtra>>;
};

export type PendingNextPageState =
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

export type SuccessfulHttpResponse<TPayload extends AdapterPayload, TBody extends HttpRequestBody> = Extract<
	HttpResponse<TPayload, TBody>,
	{ readonly success: true }
>["response"];

/**
 * Result type that represents a success or failure of an operation.
 *
 * Ensures that consumers of this library handle both success and failure cases.
 */
export type SafeQueryResult<TPayload, TError = KontentSdkError> =
	| Success<{ readonly response: TPayload }>
	| Failure<{ readonly response?: never }, TError>;

export type SafePagingQueryResult<TPayload, TError = KontentSdkError, TExtra = unknown> =
	| Success<
			{
				readonly responses: readonly TPayload[];
				readonly partialResponses?: never;
			} & TExtra
	  >
	| Failure<
			{
				readonly responses?: never;
				readonly partialResponses: readonly TPayload[];
			} & { [K in keyof TExtra]: never },
			TError
	  >;

export type PagingQueryResponse<TPayload, TExtra = unknown> = {
	readonly responses: readonly TPayload[];
} & TExtra;

export type ResolveQueryResult<TPayload extends JsonValue, TError = KontentSdkError, TMeta = unknown, TExtra = unknown> = Promise<
	SafeQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError>
>;

export type FetchQueryRequest<TPayload extends JsonValue, TError = KontentSdkError, TMeta = unknown, TExtra = unknown> = Pick<
	QueryInputData<TPayload, null, TMeta, TExtra, TError>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal" | "mapError" | "mapExtraResponseProps"
> &
	RequestDataWithoutBody;

export type MutationQueryRequest<
	TPayload extends JsonValue,
	TBody extends HttpRequestBody,
	TError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
> = Pick<
	QueryInputData<TPayload, TBody, TMeta, TExtra, TError>,
	"config" | "zodSchema" | "sdkInfo" | "mapMetadata" | "abortSignal" | "mapError" | "mapExtraResponseProps"
> & { readonly method: MutationHttpMethod } & RequestData<TBody>;

export type QueryInputData<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TExtra, TError> = {
	readonly method: HttpMethod;
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TPayload>;
	readonly sdkInfo: SdkInfo;
	readonly abortSignal?: AbortSignal | undefined;
	readonly url: string | URL;
	readonly body: TBody;
	readonly requestHeaders?: readonly Header[];
	readonly continuationToken?: string | undefined;
	readonly authorizationApiKey?: string | undefined;
} & MetadataMapperConfig<TPayload, TBody, TMeta> &
	ExtraResponsePropsMapper<TPayload, TBody, TExtra> &
	ErrorMapper<TError>;

export type PagingQueryInputData<
	TPayload extends JsonValue,
	TBody extends HttpRequestBody,
	TMeta,
	TExtra,
	TPagingExtra,
	TError,
> = QueryInputData<TPayload, TBody, TMeta, TExtra, TError> & {
	readonly mapPagingExtraResponseProps: (responses: readonly QueryResponse<TPayload, TMeta, TExtra>[]) => TPagingExtra;
};

export type QueryInspection = Pick<
	ResolvedQueryData<JsonValue, HttpRequestBody, unknown, unknown, unknown>,
	"url" | "requestHeaders" | "body" | "method"
>;

export type ResolvedQueryData<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TExtra, TError> = {
	readonly url: URL;
	readonly requestHeaders: readonly Header[];
	readonly httpService: HttpService;
	readonly body: TBody;
	readonly method: HttpMethod;
	readonly abortSignal?: AbortSignal | undefined;
	readonly zodSchema: ZodType<TPayload>;
	readonly responseValidation: SdkConfig["responseValidation"];
} & MetadataMapperConfig<TPayload, TBody, TMeta> &
	ExtraResponsePropsMapper<TPayload, TBody, TExtra> &
	ErrorMapper<TError>;

type MetadataMapperConfig<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta> = {
	readonly mapMetadata: MetadataMapper<TPayload, TBody, TMeta>;
};

type ExtraResponsePropsMapper<TPayload extends JsonValue, TBody extends HttpRequestBody, TExtra> = {
	readonly mapExtraResponseProps: (response: HttpResponse<TPayload, TBody>["response"]) => TExtra;
};

type ErrorMapper<TError> = {
	readonly mapError: (error: KontentSdkError) => TError;
};

type MetadataMapper<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta> = (
	response: SuccessfulHttpResponse<TPayload, TBody>,
	data: MetadataContext,
) => TMeta;

type MetadataContext = {
	readonly continuationToken: string | undefined;
};

type RequestData<TBody extends HttpRequestBody> = {
	readonly url: string | URL;
	readonly body: TBody;
	readonly requestHeaders?: readonly Header[];
	readonly continuationToken?: string | undefined;
	readonly authorizationApiKey?: string | undefined;
};

type MutationHttpMethod = PickStringLiteral<HttpMethod, "POST" | "PUT" | "PATCH" | "DELETE">;

type RequestDataWithoutBody = Omit<RequestData<null>, "body">;
