import { type $ZodType, safeParseAsync } from "zod/v4/core";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { isDefined } from "../utils/core.utils.js";
import { createSdkError } from "../utils/error.utils.js";
import { resolveSchema, type SchemaInput } from "../utils/schema.utils.js";
import type { Failure } from "../utils/try-catch.utils.js";
import type { PagedFetchQuery, Query, SdkConfig } from "./sdk-models.js";

/**
 * Checks if a query is a paging query.
 */
export function isPagingQuery<TPayload extends JsonValue, TError, TMeta>(
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

export async function parseResponse<TPayload extends JsonValue>({
	url,
	payload,
	schema,
}: {
	readonly url: URL;
	readonly payload: TPayload;
	readonly schema: $ZodType<TPayload>;
}): Promise<Failure<{ readonly response?: never }, KontentSdkError> | undefined> {
	const { success, error } = await safeParseAsync(schema, payload);

	if (!success) {
		return {
			success: false,
			error: createSdkError({
				baseErrorData: {
					message: `Failed to parse response payload for '${url.toString()}'`,
					url,
					retryStrategyOptions: undefined,
					retryAttempt: undefined,
				},
				details: {
					reason: "schemaMismatch",
					zodError: error,
					payload,
					url,
				},
			}),
		};
	}

	return undefined;
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
		payloads.map(async ({ url, payload }) => await parseResponse({ url, payload, schema: resolvedSchema })),
	);
	return results.find(isDefined)?.error;
}
