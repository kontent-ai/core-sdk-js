/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { AdapterPayload, AdapterResponse, HttpRequestBody, HttpResponse, HttpService, SafeHttpResult } from "../http/http.models.js";
import type { Header, HttpMethod, SdkInfo } from "../models/core.models.js";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { PickStringLiteral } from "../models/utility.types.js";
import type { SchemaInput } from "../utils/schema.utils.js";
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
	 * Configuration for runtime validation against expected schema.
	 */
	readonly runtimeValidation?: {
		/**
		 * When enabled, the response data will be validated against the expected Zod schema from which the types
		 * this library are based on. This ensures that you are working with the correct data types.
		 *
		 * @default false
		 */
		readonly validateResponses: boolean;
	};
} & TExtendedConfig;

export type Query<TError extends KontentSdkError = KontentSdkError> = {
	readonly inspect: () => TryCatchResult<QueryInspection, TError>;
};

export type FetchQuery<
	TPayload extends JsonValue,
	TError extends KontentSdkError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
> = Query<TError> & {
	readonly fetchSafe: () => Promise<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	readonly fetch: () => Promise<QueryResponse<TPayload, TMeta, TExtra>>;
};

export type PagedFetchQuery<
	TPayload extends JsonValue,
	TError extends KontentSdkError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
	TPagingExtra = unknown,
> = Query<TError> & {
	readonly fetchPageSafe: () => Promise<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	readonly fetchPage: () => Promise<QueryResponse<TPayload, TMeta, TExtra>>;
	readonly fetchAllPagesSafe: (
		config?: PagingConfig,
	) => Promise<SafePagingQueryResult<QueryResponse<TPayload, TMeta, TExtra>, TError, TPagingExtra>>;
	readonly fetchAllPages: (config?: PagingConfig) => Promise<PagingQueryResponse<QueryResponse<TPayload, TMeta, TExtra>, TPagingExtra>>;
	readonly pagesSafe: (config?: PagingConfig) => AsyncGenerator<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	readonly pages: (config?: PagingConfig) => AsyncGenerator<QueryResponse<TPayload, TMeta, TExtra>>;
};

export type MutationQuery<
	TPayload extends JsonValue,
	TError extends KontentSdkError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
> = Query<TError> & {
	readonly executeSafe: () => Promise<SafeHttpResult<QueryResponse<TPayload, TMeta, TExtra>, TError>>;
	readonly execute: () => Promise<QueryResponse<TPayload, TMeta, TExtra>>;
};

export type SuccessfulHttpResponse<TPayload extends AdapterPayload, TBody extends HttpRequestBody> = Extract<
	HttpResponse<TPayload, TBody>,
	{ readonly success: true }
>["response"];

export type SafePagingQueryResult<TPayload, TError extends KontentSdkError = KontentSdkError, TExtra = unknown> =
	| Success<
			{
				readonly responses: readonly TPayload[];
			} & TExtra
	  >
	| Failure<
			{
				readonly responses?: never;
			} & { readonly [K in keyof TExtra]: never },
			TError
	  >;

export type GetNextPageData<TPayload extends JsonValue, TMeta = unknown, TExtra = unknown> = (
	response: QueryResponse<TPayload, TMeta, TExtra>,
) => {
	readonly continuationToken?: string | undefined;
	readonly nextPageUrl?: string | undefined;
};

export type PagingConfig = {
	/**
	 * The maximum number of pages to fetch. If not provided or set to 0, the pagination will continue until the last page is reached.
	 */
	readonly maxPagesCount?: number;
};

export type PagingQueryResponse<TPayload, TExtra = unknown> = {
	readonly responses: readonly TPayload[];
} & TExtra;

export type FetchQueryRequest<
	TPayload extends JsonValue,
	TError extends KontentSdkError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
> = QueryRequestBase<TPayload, null, TMeta, TExtra, TError> & Omit<RequestData<null>, "body">;

export type MutationQueryRequest<
	TPayload extends JsonValue,
	TBody extends HttpRequestBody,
	TError extends KontentSdkError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
> = QueryRequestBase<TPayload, TBody, TMeta, TExtra, TError> & RequestData<TBody> & { readonly method: MutationHttpMethod };

export type QueryInputData<
	TPayload extends JsonValue,
	TBody extends HttpRequestBody,
	TMeta,
	TExtra,
	TError extends KontentSdkError,
> = QueryRequestBase<TPayload, TBody, TMeta, TExtra, TError> &
	RequestData<TBody> & {
		readonly method: HttpMethod;
		readonly continuationToken?: string | undefined;
		readonly authorizationApiKey?: string | undefined;
	};

export type QueryInspection = {
	readonly url: URL;
	readonly requestHeaders: readonly Header[];
	readonly body: HttpRequestBody;
	readonly method: HttpMethod;
};

type QueryMappers<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TExtra, TError extends KontentSdkError> = {
	readonly mapMetadata: (
		response: SuccessfulHttpResponse<TPayload, TBody>,
		context: { readonly continuationToken: string | undefined },
	) => TMeta;
	readonly mapExtraResponseProps: (response: SuccessfulHttpResponse<TPayload, TBody>) => TExtra;
	readonly mapError: (error: KontentSdkError) => TError;
};

type QueryRequestBase<TPayload extends JsonValue, TBody extends HttpRequestBody, TMeta, TExtra, TError extends KontentSdkError> = {
	readonly config: SdkConfig;
	readonly schema: SchemaInput<TPayload>;
	readonly sdkInfo: SdkInfo;
	readonly abortSignal?: AbortSignal | undefined;
} & QueryMappers<TPayload, TBody, TMeta, TExtra, TError>;

type RequestData<TBody extends HttpRequestBody> = {
	readonly url: string | URL;
	readonly body: TBody;
	readonly requestHeaders?: readonly Header[];
};

type MutationHttpMethod = PickStringLiteral<HttpMethod, "POST" | "PUT" | "PATCH" | "DELETE">;
