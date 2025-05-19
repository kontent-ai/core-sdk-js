import { getEnvironmentRequiredValue } from './test.utils.js';

export const integrationEnv = {
	id: getEnvironmentRequiredValue('INTEGRATION_ENVIRONMENT_ID'),
	apiKey: getEnvironmentRequiredValue('INTEGRATION_MANAGEMENT_API_KEY'),
} as const;
