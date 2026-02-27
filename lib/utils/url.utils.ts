export function getEndpointUrl({
	environmentId,
	path,
	baseUrl,
}: {
	readonly environmentId: string;
	readonly path: string;
	readonly baseUrl: string;
}): string {
	return removeDuplicateSlashes(`${baseUrl}/${environmentId}/${path}`);
}

function removeDuplicateSlashes(path: string): string {
	return path.replace(/\/+/g, "/");
}
