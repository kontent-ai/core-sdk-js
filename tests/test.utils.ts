import type { GetNextPageData } from "../lib/public_api.js";

export function preventInfinitePaging({
	responseIndex,
	maxPagesCount,
	continuationToken,
	nextPageUrl,
}: {
	readonly responseIndex: number;
	readonly maxPagesCount: number;
	readonly continuationToken?: string;
	readonly nextPageUrl?: string;
}): ReturnType<GetNextPageData<null, null>> {
	if (responseIndex >= maxPagesCount + 100) {
		throw new Error("Infinite paging detected");
	}

	return {
		continuationToken,
		nextPageUrl,
	};
}

export function getNextPageUrl(index: number): string {
	return `https://page-url.com/${index}`;
}
