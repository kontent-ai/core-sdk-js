export function getEndpointUrl({
	environmentId,
	path,
	baseUrl,
}: {
	readonly environmentId: string;
	readonly path: string;
	readonly baseUrl: string;
}): string {
	return `${removeTrailingSlashes(baseUrl)}${removeDuplicateSlashes(`/${environmentId}/${path}`)}`;
}

function removeDuplicateSlashes(path: string): string {
	return path.replace(/\/+/g, "/");
}

function removeTrailingSlashes(path: string): string {
	return path.replace(/\/+$/, "");
}
