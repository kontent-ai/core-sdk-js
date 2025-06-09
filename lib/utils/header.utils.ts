import type { Header, SDKInfo } from "../models/core.models.js";

export function getSdkIdHeader(info: SDKInfo): Header {
	return {
		name: "X-KC-SDKID",
		value: `${info.host};${info.name};${info.version}`,
	};
}

export function getRetryAfterHeaderValue(headers: readonly Header[]): number | undefined {
	const retryAfterHeader = headers.find((header) => header.name.toLowerCase() === "Retry-After".toLowerCase());

	if (!retryAfterHeader) {
		return undefined;
	}

	return +retryAfterHeader.value;
}

export function toSdkHeaders(headers: Headers): readonly Header[] {
	return Array.from(headers.entries()).map(([key, value]) => ({
		name: key,
		value: value,
	}));
}

export function toFetchHeaders(headers: readonly Header[]): Headers {
	return headers.reduce<Headers>((headers, header) => {
		headers.append(header.name, header.value);
		return headers;
	}, new Headers());
}
