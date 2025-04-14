/*
 * Public API
 */
export {
    CoreSdkError,
    type HttpQueryOptions,
    type HttpResponse,
    type HttpService,
    type HttpServiceStatus
} from './http/http.models.js';
export { defaultHttpService } from './http/http.service.js';
export type { Header, HttpMethod, RetryStrategyOptions, SDKInfo } from './models/core.models.js';
export { toRequiredRetryStrategyOptions } from './utils/retry.utils.js';
export { createVersionFile, deleteFolderRecursive } from './utils/script.utils.js';
