/**
 * Shared query models/types intended to be reused across SDKs (e.g. Sync, Delivery, Management)
 * to keep common code and behavior consistent.
 */

import type { ZodError, ZodType } from "zod";
import type { HttpService, RequestBody } from "../http/http.models.js";
import { getDefaultHttpService } from "../http/http.service.js";
import type { CommonHeaderNames, ContinuationHeaderName, Header, SDKInfo } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { EmptyObject } from "../models/utility.models.js";
import { createSdkError } from "../utils/error.utils.js";
import { getSdkIdHeader } from "../utils/header.utils.js";
import type { NextPageStateWithRequest, Query, SdkConfig, SuccessfulHttpResponse } from "./sdk-models.js";

export type QueryPromiseResult<TResponsePayload extends JsonValue, TMeta = EmptyObject> = ReturnType<
	Pick<Query<TResponsePayload, TMeta>, "toPromise">["toPromise"]
>;

type MetadataContextData = {
	readonly continuationToken?: string;
};

type MetadataMapper<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta> = (
	response: SuccessfulHttpResponse<TResponsePayload, TRequestBody>,
	data: MetadataContextData,
) => TMeta;
type MetadataMapperConfig<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta> = {
	readonly mapMetadata: MetadataMapper<TResponsePayload, TRequestBody, TMeta>;
};

export type ResolveQueryData<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta> = {
	readonly nextPageState: NextPageStateWithRequest;
	readonly request: Parameters<HttpService["requestAsync"]>[number] & { readonly body: TRequestBody };
	readonly config: SdkConfig;
	readonly zodSchema: ZodType<TResponsePayload>;
	readonly sdkInfo: SDKInfo;
	readonly authorizationApiKey: string | undefined;
} & MetadataMapperConfig<TResponsePayload, TRequestBody, TMeta>;

export function createQuery<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta = EmptyObject>(
	data: Omit<ResolveQueryData<TResponsePayload, TRequestBody, TMeta>, "continuationToken" | "nextPageState" | "pageIndex">,
): Pick<Query<TResponsePayload, TMeta>, "toPromise"> {
	return {
		toPromise: async () => {
			return await resolveQueryAsync<TResponsePayload, TRequestBody, TMeta>({
				...data,
				nextPageState: {
					hasNextPage: true,
					pageSource: "firstRequest",
				},
			});
		},
	};
}

export function extractContinuationToken(responseHeaders: readonly Header[]): string | undefined {
	return responseHeaders.find((header) => header.name.toLowerCase() === ("X-Continuation" satisfies ContinuationHeaderName).toLowerCase())
		?.value;
}

function getHttpService(config: SdkConfig) {
	return config.httpService ?? getDefaultHttpService();
}

function getCombinedRequestHeaders({
	requestHeaders,
	continuationToken,
	authorizationApiKey,
	sdkInfo,
}: {
	readonly requestHeaders: readonly Header[];
	readonly continuationToken: string | undefined;
	readonly authorizationApiKey: string | undefined;
	readonly sdkInfo: SDKInfo;
}): readonly Header[] {
	return [
		getSdkIdHeader({
			host: sdkInfo.host,
			name: sdkInfo.name,
			version: sdkInfo.version,
		}),
		...requestHeaders,
		...(continuationToken
			? [
					{
						name: "X-Continuation" satisfies CommonHeaderNames,
						value: continuationToken,
					},
				]
			: []),
		...(authorizationApiKey
			? [
					{
						name: "Authorization" satisfies CommonHeaderNames,
						value: `Bearer ${authorizationApiKey}`,
					},
				]
			: []),
	];
}

export async function resolveQueryAsync<TResponsePayload extends JsonValue, TRequestBody extends RequestBody, TMeta>({
	config,
	request,
	mapMetadata,
	zodSchema,
	sdkInfo,
	authorizationApiKey,
	nextPageState,
}: ResolveQueryData<TResponsePayload, TRequestBody, TMeta>): QueryPromiseResult<TResponsePayload, TMeta> {
	const { success, response, error } = await getHttpService(config).requestAsync<TResponsePayload, TRequestBody>({
		body: request.body,
		url: nextPageState?.nextPageUrl ?? request.url,
		method: request.method,
		requestHeaders: getCombinedRequestHeaders({
			requestHeaders: request.requestHeaders ?? [],
			continuationToken: nextPageState?.continuationToken,
			authorizationApiKey: authorizationApiKey,
			sdkInfo,
		}),
	});

	if (!success) {
		return {
			success: false,
			error,
		};
	}

	if (config.responseValidation?.enable) {
		const { isValid, error: validationError } = await validateResponseSchemaAsync(response.payload, zodSchema);
		if (!isValid) {
			return {
				success: false,
				error: createSdkError({
					message: `Failed to validate response schema for url '${request.url}'`,
					reason: "validationFailed",
					zodError: validationError,
					response,
					url: request.url,
				}),
			};
		}
	}

	const continuationTokenFromResponse = extractContinuationToken(response.adapterResponse.responseHeaders);

	const result: Awaited<QueryPromiseResult<TResponsePayload, TMeta>> = {
		success: true,
		response: {
			payload: response.payload,
			meta: {
				url: response.adapterResponse.url,
				responseHeaders: response.adapterResponse.responseHeaders,
				status: response.adapterResponse.status,
				continuationToken: continuationTokenFromResponse,
				...mapMetadata(response, { continuationToken: continuationTokenFromResponse }),
			},
		},
	};

	return result;
}

async function validateResponseSchemaAsync<TResponsePayload extends JsonValue>(
	payload: TResponsePayload,
	zodSchema: ZodType<TResponsePayload>,
): Promise<
	| {
			readonly isValid: true;
			readonly error?: never;
	  }
	| {
			readonly isValid: false;
			readonly error: ZodError;
	  }
> {
	const validateResult = await zodSchema.safeParseAsync(payload);

	if (validateResult.success) {
		return {
			isValid: true,
		};
	}

	return {
		isValid: false,
		error: validateResult.error,
	};
}
