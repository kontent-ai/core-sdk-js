import { createVersionFile } from '../lib/utils/script.utils.js';
import packageJson from '../package.json' with { type: 'json' };

createVersionFile({
    filePath: './lib/sdk.ts',
    propertyName: 'sdkInfo',
    packageName: packageJson.name,
    packageVersion: packageJson.version
});
