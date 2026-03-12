import type { HttpRequestBody } from "../../http/http.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { resolveQuery } from "../resolve-query.js";
import type { MutationQuery, MutationQueryRequest } from "../sdk-models.js";

export function createMutationQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta>(
	data: MutationQueryRequest<TResponsePayload, TRequestBody, TMeta>,
): MutationQuery<TResponsePayload, TMeta> {
	const executeSafe = async () => await resolveQuery<TResponsePayload, TRequestBody, TMeta>(data);

	return {
		schema: data.zodSchema,
		url: data.request.url,
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
