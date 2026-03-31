/** biome-ignore-all lint/correctness/useImportExtensions: Biome does not have a way to support this feature */
import { replaceSdkVersionPlaceholder } from "../lib/devkit/sdk-version.utils.js";

import packageJson from "../package.json" with { type: "json" };

replaceSdkVersionPlaceholder("./dist/core-sdk-info.js", packageJson.version);
