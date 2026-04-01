import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { getEnvironmentRequiredValue } from "../lib/devkit_api.js";
import type { Header } from "../lib/models/core.models.js";

export function getIntegrationTestConfig() {
	loadEnvironmentVariables();

	const integrationEnv = {
		id: getEnvironmentRequiredValue("INTEGRATION_ENVIRONMENT_ID"),
		apiKey: getEnvironmentRequiredValue("INTEGRATION_MANAGEMENT_API_KEY"),
	} as const;

	const baseMapiUrl = `https://manage.kontent.ai/v2/projects/${integrationEnv.id}`;
	const assetsUrl = `${baseMapiUrl}/assets`;

	return {
		getMapiAuthorizationHeaders: (): readonly Header[] => {
			return [
				{
					name: "Authorization",
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
			listItemsUrl: `${baseMapiUrl}/items`,
		},
		fileToUpload: new Blob(["core-sdk-integration-test"], { type: "text/plain" }),
		/**
		 * Controls whether the test also verifies the downloaded file contents.
		 *
		 * This check can be unreliable because the Kontent.ai API may return a file that is not yet
		 * fully accessible immediately after upload. The same issue can occur for files manually uploaded
		 * to Kontent.ai and retrieved via the "Copy URL" feature.
		 *
		 * Info: The file contents may come back as a Blob with 0 bytes.
		 *
		 */
		compareFileContents: true,
	};
}

function loadEnvironmentVariables(): void {
	const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");

	if (existsSync(envFilePath)) {
		loadEnvFile(envFilePath);
	}
}
