import type { ZodType } from "zod";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { MutationQuery, SdkConfig } from "../sdk-models.js";
import { applyTransformOrThrow, applyTransformSafely, createTransformResponse } from "./transform-utils.js";

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
	readonly transform: (payload: TPayload) => TTransformedPayload;
	readonly transformSchema: () => Promise<ZodType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): MutationQuery<TTransformedPayload, TError, TMeta, TExtra> {
	const transformResponse = createTransformResponse<TPayload, TTransformedPayload, TError, TMeta, TExtra>({
		config,
		transform,
		transformSchema,
		mapError,
	});

	return {
		execute: async () => applyTransformOrThrow(await query.execute(), transformResponse),
		executeSafe: async () => applyTransformSafely(await query.executeSafe(), transformResponse),
		inspect: query.inspect,
	};
}
