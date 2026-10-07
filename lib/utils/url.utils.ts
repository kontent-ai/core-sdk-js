import type { BaseErrorData, ErrorDetailsFor, KontentSdkError } from "../models/error.models.js";
import type { BaseUrl } from "../sdk/sdk-models.js";
import { createSdkError } from "./error.utils.js";
import { type TryCatchResult, tryCatch } from "./try-catch.utils.js";

export type RetryContext = Pick<BaseErrorData, "retryStrategyOptions" | "retryAttempt">;

export function getEndpointUrl({
	environmentId,
	path,
	baseUrl,
}: {
	readonly environmentId: string;
	readonly path: string;
	readonly baseUrl: BaseUrl;
}): string {
	return `${baseUrl.protocol}://${removeTrailingSlashes(baseUrl.host)}${removeDuplicateSlashesFromPath(`/${environmentId}/${path}`)}`;
}

// splits the path part from the query string / fragment, which may legitimately contain '//' (e.g. an encoded url value)
const pathAndRestPattern = /^([^?#]*)(.*)$/s;

function removeDuplicateSlashesFromPath(pathWithQuery: string): string {
	const [, path = "", rest = ""] = pathAndRestPattern.exec(pathWithQuery) ?? [];
	return `${path.replace(/\/+/g, "/")}${rest}`;
}

function removeTrailingSlashes(path: string): string {
	return path.replace(/\/+$/, "");
}

/**
 * Parses a URL string (a `URL` instance is returned as is). On failure returns an `invalidUrl` error,
 * optionally carrying the retry context of the request it belongs to.
 */
export function parseUrl(
	url: string | URL,
	retryContext?: RetryContext,
): TryCatchResult<URL, KontentSdkError<ErrorDetailsFor<"invalidUrl">>> {
	if (typeof url !== "string") {
		return { success: true, data: url };
	}

	const { success, data, error } = tryCatch(() => new URL(url));

	if (!success) {
		return { success: false, error: createInvalidUrlError({ url, error, retryContext }) };
	}

	return { success: true, data };
}

function createInvalidUrlError({
	url,
	error,
	retryContext,
}: {
	readonly url: string;
	readonly error: unknown;
	readonly retryContext: RetryContext | undefined;
}): KontentSdkError<ErrorDetailsFor<"invalidUrl">> {
	return createSdkError({
		baseErrorData: {
			message: `Failed to parse url '${url}'.`,
			url,
			retryStrategyOptions: retryContext?.retryStrategyOptions,
			retryAttempt: retryContext?.retryAttempt,
		},
		details: {
			reason: "invalidUrl",
			originalError: error,
		},
	});
}
