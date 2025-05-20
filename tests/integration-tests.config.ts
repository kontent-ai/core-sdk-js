import type { Header } from '../lib/models/core.models.js';
import { getEnvironmentRequiredValue } from './test.utils.js';

const integrationEnv = {
	id: getEnvironmentRequiredValue('INTEGRATION_ENVIRONMENT_ID'),
	apiKey: getEnvironmentRequiredValue('INTEGRATION_MANAGEMENT_API_KEY'),
} as const;

export function getIntegrationTestConfig() {
	const baseMapiUrl = `https://manage.kontent.ai/v2/projects/${integrationEnv.id}`;
	const assetsUrl = `${baseMapiUrl}/assets`;

	return {
		getMapiAuthorizationHeaders: (): readonly Header[] => {
			return [
				{
					name: 'Authorization',
					value: `Bearer ${integrationEnv.apiKey}`,
				},
			];
		},
		environmentId: integrationEnv.id,
		urls: {
			baseMapiUrl: baseMapiUrl,
			getUploadAssetBinaryFileUrl: (filename: string) => `${baseMapiUrl}/files/${filename}`,
			getDeleteAssetUrl: (assetId: string) => `${assetsUrl}/${assetId}`,
			addAssetUrl: assetsUrl,
		},
	};
}
