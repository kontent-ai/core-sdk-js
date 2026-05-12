import type { HttpRequestBody } from "../../http/http.models.js";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { inspectQuery, resolveQuery } from "../resolve-query.js";
import type { MutationQuery, MutationQueryRequest } from "../sdk-models.js";

export function createMutationQuery<
	TPayload extends JsonValue,
	TBody extends HttpRequestBody,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
	TTransformedPayload extends TPayload = TPayload,
>(
	data: MutationQueryRequest<TPayload, TBody, TError, TMeta, TExtra, TTransformedPayload>,
): MutationQuery<TPayload, TError, TMeta, TExtra, TTransformedPayload> {
	const executeSafe = async () => await resolveQuery<TPayload, TBody, TMeta, TExtra, TError, TTransformedPayload>(data);

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
