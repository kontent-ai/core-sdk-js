/**
 * Devkit API - common functions used by dependent packages, not intended for public use
 */
export type { FetchResponse } from './devkit/devkit.models.js';
export { deleteFolderRecursive } from './devkit/script.utils.js';
export type { getFakeBlob, getFetchBlobMock, getFetchJsonMock } from './devkit/test.utils.js';
export { replaceSdkVersionPlaceholder } from './utils/sdk-version.utils.js';
