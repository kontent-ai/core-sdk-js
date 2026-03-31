import type { GetNextPageData } from "../lib/public_api.js";

const upperBoundLimitForInfinitePaging = 1;

export function preventInfinitePaging({
	responseIndex,
	maxPagesCount,
	continuationToken,
	nextPageUrl,
}: {
	readonly responseIndex: number;
	readonly maxPagesCount: number;
	readonly continuationToken?: string;
	readonly nextPageUrl?: string | undefined;
}): ReturnType<GetNextPageData<null, null>> {
	if (responseIndex >= maxPagesCount + upperBoundLimitForInfinitePaging) {
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
