import { describe, expect, it } from 'vitest';
import type { HttpServiceStatus } from '../../lib/http/http.models.js';
import { getDefaultHttpService } from '../../lib/http/http.service.js';
import { HttpServiceInvalidResponseError } from '../../lib/models/error.models.js';
import { getIntegrationTestConfig } from '../integration-tests.config.js';

const fileToUpload = new Blob(['core-sdk-integration-test'], { type: 'text/plain' });

describe('Integration tests - Binary file / asset management', async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService({
		retryStrategy: {
			maxAttempts: 5,
			defaultDelayBetweenRequestsMs: 1000,
			canRetryError: (error) => {
				if (error instanceof HttpServiceInvalidResponseError) {
					// we intetionally retry 404 because when we upload a file and get the URL back, the file might not yet be accessible
					// and the request will fail with 404.
					return error.adapterResponse.status === 404;
				}

				return false;
			},
		},
	});

	const uploadBinaryFileAsync = async () => {
		return await httpService.uploadFileAsync<{
			readonly id: string;
		}>({
			url: config.urls.getUploadAssetBinaryFileUrl('core-sdk.txt'),
			body: fileToUpload,
			method: 'POST',
			requestHeaders: config.getMapiAuthorizationHeaders(),
		});
	};

	const addAssetAsync = async (binaryFileId: string) => {
		return await httpService.requestAsync<
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
			requestHeaders: config.getMapiAuthorizationHeaders(),
		});
	};

	const deleteAssetAsync = async (assetId: string) => {
		return await httpService.requestAsync<null, null>({
			url: config.urls.getDeleteAssetUrl(assetId),
			body: null,
			method: 'DELETE',
			requestHeaders: config.getMapiAuthorizationHeaders(),
		});
	};

	const downloadAssetFileAsync = async (fileUrl: string) => {
		return await httpService.downloadFileAsync({
			url: fileUrl,
		});
	};

	const uploadedBinaryFileResponse = await uploadBinaryFileAsync();

	it('Upload response status should be 200', () => {
		expect(uploadedBinaryFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it('Id property should be available', () => {
		expect(uploadedBinaryFileResponse.data.id).toBeDefined();
	});

	const addAssetResponse = await addAssetAsync(uploadedBinaryFileResponse.data.id);

	it('Add asset response status should be 201', () => {
		expect(addAssetResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(201);
	});

	it('Url & id property should be available when adding asset', () => {
		expect(addAssetResponse.data.id).toBeDefined();
		expect(addAssetResponse.data.url).toBeDefined();
	});

	const downloadedFileResponse = await downloadAssetFileAsync(addAssetResponse.data.url);

	it('Download file response status should be 200', () => {
		expect(downloadedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it('Content of downloaded file should be identical to original file', async () => {
		expect(await downloadedFileResponse.data.text()).toStrictEqual(await fileToUpload.text());
	});

	const deletedFileResponse = await deleteAssetAsync(addAssetResponse.data.id);

	it('Delete file response status should be 204', () => {
		expect(deletedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(204);
	});

	it('Delete file response data should be empty', () => {
		expect(deletedFileResponse.data).toStrictEqual(null);
	});
});
