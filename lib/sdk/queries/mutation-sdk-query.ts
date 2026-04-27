import type { HttpRequestBody } from "../../http/http.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { inspectQuery, resolveQuery } from "../resolve-query.js";
import type { MutationQuery, MutationQueryRequest } from "../sdk-models.js";

export function createMutationQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError>(
	data: MutationQueryRequest<TResponsePayload, TRequestBody, TMeta, TError>,
): MutationQuery<TResponsePayload, TMeta, TError> {
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
