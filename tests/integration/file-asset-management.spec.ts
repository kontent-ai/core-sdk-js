import { describe, expect, it } from 'vitest';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import type { HttpServiceStatus } from '../../lib/public_api.js';
import { getIntegrationTestConfig } from '../integration-tests.config.js';

const fileToUpload = new Blob(['core-sdk-integration-test'], { type: 'text/plain' });

describe('Integration tests - Binary file / asset management', async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService();

	const uploadBinaryFileAsync = async () => {
		return await httpService.uploadFileAsync<{
			readonly id: string;
		}>({
			url: config.urls.getUploadAssetBinaryFileUrl('core-sdk.txt'),
			file: fileToUpload,
			method: 'POST',
			options: {
				requestHeaders: config.getMapiAuthorizationHeaders(),
			},
		});
	};

	const addAssetAsync = async (binaryFileId: string) => {
		return await httpService.executeAsync<
			{
				readonly id: string;
				readonly url: string;
			},
			{
				readonly file_reference: {
					readonly id: string;
					readonly type: 'internal';
				};
				readonly title: string;
			}
		>({
			url: config.urls.addAssetUrl,
			body: {
				file_reference: {
					id: binaryFileId,
					type: 'internal',
				},
				title: 'Test file',
			},
			method: 'POST',
			options: {
				requestHeaders: config.getMapiAuthorizationHeaders(),
			},
		});
	};

	const deleteAssetAsync = async (assetId: string) => {
		return await httpService.executeAsync<null, null>({
			url: config.urls.getDeleteAssetUrl(assetId),
			body: null,
			method: 'DELETE',
			options: {
				requestHeaders: config.getMapiAuthorizationHeaders(),
			},
		});
	};

	const downloadAssetFileAsync = async (fileUrl: string) => {
		return await httpService.downloadFileAsync({
			url: fileUrl,
			options: {
				requestHeaders: config.getMapiAuthorizationHeaders(),
			},
		});
	};

	const uploadedBinaryFileResponse = await uploadBinaryFileAsync();

	it('Upload response status should be 200', () => {
		expect(uploadedBinaryFileResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it('Id property should be available', () => {
		expect(uploadedBinaryFileResponse.data.id).toBeDefined();
	});

	const addAssetResponse = await addAssetAsync(uploadedBinaryFileResponse.data.id);

	it('Add asset response status should be 201', () => {
		expect(addAssetResponse.status).toStrictEqual<HttpServiceStatus>(201);
	});

	it('Url & id property should be available when adding asset', () => {
		expect(addAssetResponse.data.id).toBeDefined();
		expect(addAssetResponse.data.url).toBeDefined();
	});

	const downloadedFileResponse = await downloadAssetFileAsync(addAssetResponse.data.url);

	it('Download file response status should be 200', () => {
		expect(downloadedFileResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it('Content of downloaded file should be identical to original file', async () => {
		expect(await downloadedFileResponse.data.text()).toStrictEqual(await fileToUpload.text());
	});

	const deletedFileResponse = await deleteAssetAsync(addAssetResponse.data.id);

	it('Delete file response status should be 204', () => {
		expect(deletedFileResponse.status).toStrictEqual<HttpServiceStatus>(204);
	});

	it('Delete file response data should be empty', () => {
		expect(deletedFileResponse.data).toStrictEqual(null);
	});
});
