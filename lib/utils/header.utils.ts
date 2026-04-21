import type { Header, KnownHeaderName, SdkInfo } from "../models/core.models.js";

export function getSdkIdHeader(info: SdkInfo): Header {
	return {
		name: "X-KC-SDKID" satisfies KnownHeaderName,
		value: `${info.host};${info.name};${info.version}`,
	};
}

export function createContinuationHeader(token: string): Header {
	return {
		name: "X-Continuation" satisfies KnownHeaderName,
		value: token,
	};
}

export function createAuthorizationHeader(apiKey: string): Header {
	return {
		name: "Authorization" satisfies KnownHeaderName,
		value: `Bearer ${apiKey}`,
	};
}

export function findHeaderByName(headers: readonly Header[], name: KnownHeaderName): Header | undefined {
	const normalizedName = name.toLowerCase();
	return headers.find((header) => header.name.toLowerCase() === normalizedName);
}

export function getRetryAfterHeaderValue(headers: readonly Header[]): number | undefined {
	const retryAfterHeader = findHeaderByName(headers, "Retry-After");

	if (!retryAfterHeader) {
		return undefined;
	}

	return getNumericRetryAfterHeaderValue(retryAfterHeader.value) ?? getDateRetryAfterHeaderValue(retryAfterHeader.value);
}

export function toSdkHeaders(headers: Headers): readonly Header[] {
	return Array.from(headers.entries()).map(([key, value]) => ({
		name: key,
		value: value,
	}));
}

export function toFetchHeaders(headers: readonly Header[]): Headers {
	return new Headers(headers.map((header) => [header.name, header.value]));
}

export function isApplicationJsonResponseType(headers: readonly Header[]): boolean {
	return findHeaderByName(headers, "Content-Type")?.value.toLowerCase().includes("application/json") ?? false;
}

export function extractContinuationToken(responseHeaders: readonly Header[]): string | undefined {
	return findHeaderByName(responseHeaders, "X-Continuation")?.value;
}

function getNumericRetryAfterHeaderValue(retryAfterValue: string): number | undefined {
	if (!retryAfterValue.trim()) {
		return undefined;
	}

	const parsedNumber = Number(retryAfterValue);

	if (!Number.isNaN(parsedNumber)) {
		return parsedNumber;
	}

	return undefined;
}

function getDateRetryAfterHeaderValue(retryAfterValue: string): number | undefined {
	const retryAfterDate = Date.parse(retryAfterValue);

	if (Number.isNaN(retryAfterDate)) {
		return undefined;
	}

	return Math.max(0, Math.ceil((retryAfterDate - Date.now()) / 1000));
}
