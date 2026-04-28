import type { HttpRequestBody } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { inspectQuery, resolveQuery } from "../resolve-query.js";
import type { MutationQuery, MutationQueryRequest } from "../sdk-models.js";

export function createMutationQuery<
	TPayload extends JsonValue,
	TBody extends HttpRequestBody,
	TError = KontentSdkError,
	TMeta = unknown,
	TExtra = unknown,
>(data: MutationQueryRequest<TPayload, TBody, TError, TMeta, TExtra>): MutationQuery<TPayload, TError, TMeta, TExtra> {
	const executeSafe = async () => await resolveQuery(data);

	return {
		schema: data.zodSchema,
		inspect: () => inspectQuery(data),
		executeSafe,
		execute: async () => {
			const { success, response, error } = await executeSafe();
			if (!success) {
				throw error;
			}
			return response;
		},
	};
}
