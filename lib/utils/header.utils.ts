import type { Header, SDKInfo } from '../models/core.models.js';

export function getSdkIdHeader(info: SDKInfo): Header {
    return {
        header: 'X-KC-SDKID',
        value: `${info.host};${info.name};${info.version}`
    };
}
