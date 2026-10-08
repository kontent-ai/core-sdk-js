import { type $ZodType, safeParseAsync } from "zod/v4/core";
import type { SafeHttpResult } from "../http/http.models.js";
import { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { isDefined } from "../utils/core.utils.js";
import { resolveSchema, type SchemaInput } from "../utils/schema.utils.js";
import { unwrapOrThrow } from "../utils/try-catch.utils.js";
import type { PagedFetchQuery, Query, SdkConfig } from "./sdk-models.js";

/**
 * Turns an iterator of safe results into an iterator of responses that throws on the first failure.
 */
export async function* unwrapResults<TResponse, TError extends KontentSdkError>(
	results: AsyncIterable<SafeHttpResult<TResponse, TError>>,
): AsyncGenerator<TResponse> {
	for await (const result of results) {
		yield unwrapOrThrow(result).response;
	}
}

/**
 * Checks if a query is a paging query.
 */
export function isPagingQuery<TPayload extends JsonValue, TError extends KontentSdkError, TMeta>(
	query: Query<TError> | PagedFetchQuery<TPayload, TError, TMeta>,
): query is PagedFetchQuery<TPayload, TError, TMeta> {
	return (
		"fetchPage" in query &&
		"fetchPageSafe" in query &&
		"fetchAllPages" in query &&
		"fetchAllPagesSafe" in query &&
		"pages" in query &&
		"pagesSafe" in query
	);
}

export async function validatePayload<TPayload extends JsonValue>({
	url,
	payload,
	schema,
}: {
	readonly url: URL;
	readonly payload: TPayload;
	readonly schema: $ZodType<TPayload>;
}): Promise<KontentSdkError | undefined> {
	const { success, error } = await safeParseAsync(schema, payload);

	if (success) {
		return undefined;
	}

	return new KontentSdkError({
		baseErrorData: {
			message: `Failed to parse response payload for '${url.toString()}'`,
			url: url.toString(),
			retryStrategyOptions: undefined,
			retryAttempt: undefined,
		},
		details: {
			reason: "schemaMismatch",
			zodError: error,
			payload,
			url,
		},
	});
}

/**
 * Validates payloads against the schema when runtime response validation is enabled.
 * Returns the error for the first payload (in input order) that does not match the schema, or `undefined`
 * when validation is disabled, no schema is provided, or all payloads match.
 */
export async function validatePayloads<TPayload extends JsonValue>({
	runtimeValidation,
	schema,
	payloads,
}: {
	readonly runtimeValidation: SdkConfig["runtimeValidation"];
	readonly schema: SchemaInput<TPayload>;
	readonly payloads: readonly { readonly url: URL; readonly payload: TPayload }[];
}): Promise<KontentSdkError | undefined> {
	if (!runtimeValidation?.validateResponses) {
		return undefined;
	}

	const resolvedSchema = await resolveSchema(schema);
	if (!resolvedSchema) {
		return undefined;
	}

	const results = await Promise.all(
		payloads.map(async ({ url, payload }) => await validatePayload({ url, payload, schema: resolvedSchema })),
	);
	return results.find(isDefined);
}
