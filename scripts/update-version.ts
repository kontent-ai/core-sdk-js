import packageJson from '../package.json' with { type: 'json' };
import { createVersionFile } from './script.utils.js';

createVersionFile({
	filePath: './lib/sdk.ts',
	propertyName: 'sdkInfo',
	packageName: packageJson.name,
	packageVersion: packageJson.version,
});
