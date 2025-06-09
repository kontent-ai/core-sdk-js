// biome-ignore lint/performance/noBarrelFile: One barrel for the Devkit API is fine
export { deleteFolderRecursive } from "./devkit/script.utils.js";
export { replaceSdkVersionPlaceholder } from "./utils/sdk-version.utils.js";
export type { FetchResponse } from "./devkit/devkit.models.js";
export type { getFakeBlob, getFetchBlobMock, getFetchJsonMock } from "./devkit/test.utils.js";
