import type { ZodType } from "zod";
import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { FetchQuery, SdkConfig } from "../sdk-models.js";
import { applyTransformOrThrow, applyTransformSafely, createTransformResponse } from "./transform-utils.js";

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
	readonly transform: (payload: TPayload) => TTransformedPayload;
	readonly transformSchema: () => Promise<ZodType<TTransformedPayload>>;
	readonly mapError: (error: KontentSdkError) => TError;
}): FetchQuery<TTransformedPayload, TError, TMeta, TExtra> {
	const transformResponse = createTransformResponse<TPayload, TTransformedPayload, TError, TMeta, TExtra>({
		config,
		transform,
		transformSchema,
		mapError,
	});

	return {
		fetch: async () => applyTransformOrThrow(await query.fetch(), transformResponse),
		fetchSafe: async () => applyTransformSafely(await query.fetchSafe(), transformResponse),
		inspect: query.inspect,
	};
}
