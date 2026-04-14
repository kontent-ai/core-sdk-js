import type { HttpRequestBody } from "../../http/http.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { resolveQuery, resolveUrl } from "../resolve-query.js";
import type { MutationQuery, MutationQueryRequest } from "../sdk-models.js";

export function createMutationQuery<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody, TMeta, TError>(
	data: MutationQueryRequest<TResponsePayload, TRequestBody, TMeta, TError>,
): MutationQuery<TResponsePayload, TMeta, TError> {
	const executeSafe = async () => await resolveQuery<TResponsePayload, TRequestBody, TMeta, TError>(data);

	return {
		schema: data.zodSchema,
		getUrl: () => resolveUrl<TError>({ url: data.url, baseUrl: data.config.baseUrl, mapError: data.mapError }),
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
