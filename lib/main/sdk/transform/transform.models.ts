import type { KontentSdkError } from "../../models/error.models.js";
import type { JsonValue } from "../../models/json.models.js";
import type { SchemaInput } from "../../utils/schema.utils.js";
import type { QueryResponse, SdkConfig } from "../sdk-models.js";

export type TransformBaseOptions<TTransformedPayload extends JsonValue, TError extends KontentSdkError> = {
	readonly config: Pick<SdkConfig, "runtimeValidation">;
	readonly transformSchema: SchemaInput<TTransformedPayload>;
	readonly mapError: (error: KontentSdkError) => TError;
};

/**
 * Options of a transform applied to a single query response (fetch / mutation queries).
 */
export type TransformOptions<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
> = TransformBaseOptions<TTransformedPayload, TError> & {
	readonly transform: (response: QueryResponse<TPayload, TMeta, TExtra>) => QueryResponse<TTransformedPayload, TMeta, TExtra>;
};

/**
 * Options of a transform applied to a batch of query responses (paged queries), so that the transform can
 * resolve data across all pages at once.
 */
export type PagedTransformOptions<
	TPayload extends JsonValue,
	TTransformedPayload extends TPayload,
	TError extends KontentSdkError,
	TMeta,
	TExtra,
> = TransformBaseOptions<TTransformedPayload, TError> & {
	readonly transform: (
		responses: readonly QueryResponse<TPayload, TMeta, TExtra>[],
	) => readonly QueryResponse<TTransformedPayload, TMeta, TExtra>[];
};
