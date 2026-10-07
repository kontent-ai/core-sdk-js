import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import type { MutationQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { createTransformedQueryMethods } from "./transform-utils.js";

export function transformMutationQuery<
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
	readonly query: MutationQuery<TPayload, TError, TMeta, TExtra>;
	readonly transform: (response: QueryResponse<TPayload, TMeta, TExtra>) => QueryResponse<TTransformedPayload, TMeta, TExtra>;
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
}): MutationQuery<TTransformedPayload, TError, TMeta, TExtra> {
	const { safe, unsafe } = createTransformedQueryMethods({
		config,
		transform,
		transformSchema,
		mapError,
		querySafe: query.executeSafe,
	});

	return {
		execute: unsafe,
		executeSafe: safe,
		inspect: query.inspect,
	};
}
