import type { BaseUrl } from "../sdk/sdk-models.js";

export function getEndpointUrl({
	environmentId,
	path,
	baseUrl,
}: {
	readonly environmentId: string;
	readonly path: string;
	readonly baseUrl: BaseUrl;
}): string {
	return `${baseUrl.protocol}://${removeTrailingSlashes(baseUrl.host)}${removeDuplicateSlashes(`/${environmentId}/${path}`)}`;
}

function removeDuplicateSlashes(path: string): string {
	return path.replace(/\/+/g, "/");
}

function removeTrailingSlashes(path: string): string {
	return path.replace(/\/+$/, "");
}
