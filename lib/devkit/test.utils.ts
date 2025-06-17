import type { Mock } from "vitest";
import { vi } from "vitest";
import type { HttpServiceStatus } from "../http/http.models.js";
import type { CommonHeaderNames } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { Header } from "../public_api.js";
import { isNotUndefined } from "../utils/core.utils.js";
import { toFetchHeaders } from "../utils/header.utils.js";

export function getFetchJsonMock<TResponseData extends JsonValue>({
	json,
	status,
	responseHeaders,
}: {
	readonly json: TResponseData;
	readonly status: HttpServiceStatus;
	readonly responseHeaders?: readonly Header[];
}): Mock<() => Promise<Response>> {
	return getFetchMock<JsonValue>({
		status,
		responseHeaders: responseHeaders ?? [],
		blob: undefined,
		json,
	});
}

export function getFetchBlobMock({
	blob,
	status,
	responseHeaders,
}: {
	readonly blob: Blob;
	readonly status: HttpServiceStatus;
	readonly responseHeaders?: readonly Header[];
}): Mock<() => Promise<Response>> {
	return getFetchMock<Blob>({
		blob,
		status,
		responseHeaders: responseHeaders ?? [],
		json: undefined,
	});
}

export function getFakeBlob(): Blob {
	return new Blob(["x"], { type: "text/plain" });
}

function getFetchMock<TResponseData extends JsonValue | Blob>({
	json,
	blob,
	status,
	responseHeaders,
}: {
	readonly json: TResponseData extends JsonValue ? JsonValue : undefined;
	readonly blob: TResponseData extends Blob ? Blob : undefined;
	readonly status: HttpServiceStatus;
	readonly responseHeaders: readonly Header[];
}): Mock<() => Promise<Response>> {
	return vi.fn(() => {
		const contentTypeHeader: Header | undefined = responseHeaders.find(
			(m) => m.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase(),
		)
			? undefined
			: {
					name: "Content-Type" satisfies CommonHeaderNames,
					value: "application/json",
				};

		return Promise.resolve<Response>({
			// only implement the methods we need, ignore the rest
			...({} as Response),
			ok: status === 200,
			headers: toFetchHeaders([...responseHeaders, contentTypeHeader].filter(isNotUndefined)),
			status,
			json: async () => await Promise.resolve(json),
			...(blob ? { blob: async () => await Promise.resolve(blob) } : {}),
		});
	});
}
