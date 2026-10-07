import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import { unwrapOrThrow } from "../../utils/try-catch.utils.js";
import type { MutationQuery, QueryResponse, SdkConfig } from "../sdk-models.js";
import { applyTransformSafely, createTransformResponse } from "./transform-utils.js";

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
	const transformResponse = createTransformResponse<TPayload, TTransformedPayload, TError, TMeta, TExtra>({
		config,
		transform,
		transformSchema,
		mapError,
	});

	const executeSafe = async () => applyTransformSafely(await query.executeSafe(), transformResponse);

	return {
		execute: async () => unwrapOrThrow(await executeSafe()).response,
		executeSafe,
		inspect: query.inspect,
	};
}
