import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { MutationQuery } from "../sdk-models.js";
import { createTransformedQueryMethods, type TransformOptions } from "./transform-utils.js";

export function transformMutationQuery<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	query,
	...options
}: TransformOptions<TPayload, TTransformedPayload, TError, TMeta, TExtra> & {
	readonly query: MutationQuery<TPayload, TError, TMeta, TExtra>;
}): MutationQuery<TTransformedPayload, TError, TMeta, TExtra> {
	const { safe, unsafe } = createTransformedQueryMethods({ ...options, querySafe: query.executeSafe });

	return {
		execute: unsafe,
		executeSafe: safe,
		inspect: query.inspect,
	};
}
