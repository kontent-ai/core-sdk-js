import type { KontentSdkError } from "../../models/error.models.js";
import { createSdkError } from "../../utils/error.utils.js";

export function createTransformError(error: unknown, url: URL): KontentSdkError {
	return createSdkError({
		baseErrorData: {
			message: `Failed to transform payload for url ${url.toString()}`,
			url: url.toString(),
			retryAttempt: undefined,
			retryStrategyOptions: undefined,
		},
		details: {
			originalError: error,
			reason: "transformError",
		},
	});
}
