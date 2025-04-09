import type { Header, SDKInfo } from '../models/core.models.js';

export function getSdkIdHeader(info: SDKInfo): Header {
    return {
        header: 'X-KC-SDKID',
        value: `${info.host};${info.name};${info.version}`
    };
}

export function getRetryAfterHeaderValue(headers: readonly Header[]): number | undefined {
    const retryAfterHeader = headers.find((header) => header.header === 'Retry-After');

    if (!retryAfterHeader) {
        return undefined;
    }

    return +retryAfterHeader.value;
}
