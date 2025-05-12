import { replaceSdkVersionPlaceholder } from '../lib/devkit_api.js';
import packageJson from '../package.json' with { type: 'json' };

replaceSdkVersionPlaceholder('./dist/sdk-info.js', packageJson.version);
