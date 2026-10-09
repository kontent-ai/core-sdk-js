import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { MutationQuery } from "../sdk-models.js";
import type { TransformOptions } from "./transform.models.js";
import { transformSafeResult } from "./transform-utils.js";

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
	const executeSafe = async () => await transformSafeResult(options, await query.executeSafe());

	return {
		inspect: query.inspect,
		executeSafe,
		execute: async () => unwrapOrThrow(await executeSafe()).response,
	};
}
