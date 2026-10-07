import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import type { FetchQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { createTransformedQueryMethods } from "./transform-utils.js";

export function transformFetchQuery<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
>({
	query,
	transform,
	transformSchema,
	mapError,
	config,
}: {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly query: FetchQuery<TPayload, TError, TMeta, TExtra>;
	readonly transform: (response: QueryResponse<TPayload, TMeta, TExtra>) => QueryResponse<TTransformedPayload, TMeta, TExtra>;
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
}): FetchQuery<TTransformedPayload, TError, TMeta, TExtra> {
	const { safe, unsafe } = createTransformedQueryMethods({
		config,
		transform,
		transformSchema,
		mapError,
		querySafe: query.fetchSafe,
	});

	return {
		fetch: unsafe,
		fetchSafe: safe,
		inspect: query.inspect,
	};
}
