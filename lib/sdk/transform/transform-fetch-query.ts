import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { FetchQuery } from "../sdk-models.js";
import { createSafeAndUnsafeWithTransform, type TransformOptions, transformSingleResponse } from "./transform-utils.js";

export function transformFetchQuery<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	query,
	...options
}: TransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra> & {
	readonly query: FetchQuery<TPayload, TError, TMeta, TExtra>;
}): FetchQuery<TTransformedPayload, TError, TMeta, TExtra> {
	const { safe, unsafe } = createSafeAndUnsafeWithTransform({
		querySafe: query.fetchSafe,
		transformResponse: transformSingleResponse(options),
	});

	return {
		fetch: unsafe,
		fetchSafe: safe,
		inspect: query.inspect,
	};
}
