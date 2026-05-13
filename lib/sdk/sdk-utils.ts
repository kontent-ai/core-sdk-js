import type { ZodMiniType } from "zod/mini";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { createSdkError } from "../utils/error.utils.js";
import type { Failure } from "../utils/try-catch.utils.js";
import type { PagedFetchQuery, Query } from "./sdk-models.js";

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
	readonly schema: ZodMiniType<TPayload>;
}): Promise<Failure<{ readonly response?: never }, KontentSdkError> | undefined> {
	const { success, error } = await schema.safeParseAsync(payload);

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
					reason: "parsingFailed",
					zodError: error,
					payload,
					url,
				},
			}),
		};
	}

	return undefined;
}
