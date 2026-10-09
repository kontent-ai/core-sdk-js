import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import { unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { FetchQuery } from "../sdk-models.js";
import type { TransformOptions } from "./transform.models.js";
import { transformSafeResult } from "./transform-utils.js";

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
	const fetchSafe = async () => await transformSafeResult(options, await query.fetchSafe());

	return {
		inspect: query.inspect,
		fetchSafe,
		fetch: async () => unwrapOrThrow(await fetchSafe()).response,
	};
}
