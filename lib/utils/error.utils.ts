export function getDefaultErrorMessage({
    url,
    retryAttempts,
    status
}: {
    readonly url: string;
    readonly retryAttempts: number;
    readonly status: number | undefined;
}): string {
    return `Failed to execute request '${url}' after '${retryAttempts}' attempts${
        status ? ` with status '${status}'` : ''
    }`;
}
