import { describe, expect, it } from "vitest";
import type { HttpServiceStatus } from "../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import { poll } from "../../lib/testkit/poll.utils.js";
import { getIntegrationTestConfig } from "../integration-tests.config.js";

describe("Integration tests covering the HttpService against the Kontent.ai API", async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService({
		requestHeaders: config.getMapiAuthorizationHeaders(),
		retryStrategy: {
			maxRetries: 5,
		},
	});

	const uploadBinaryFile = async () => {
		return await httpService.uploadFile<{
			readonly id: string;
		}>({
			url: config.urls.getUploadAssetBinaryFileUrl("core-sdk.txt"),
			body: config.fileToUpload,
			method: "POST",
		});
	};

	const addAsset = async (binaryFileId: string) => {
		return await httpService.request<
			{
				readonly id: string;
				readonly url: string;
			},
			{
				readonly file_reference: {
					readonly id: string;
					readonly type: "internal";
				};
				readonly title: string;
			}
		>({
			url: config.urls.addAssetUrl,
			body: {
				file_reference: {
					id: binaryFileId,
					type: "internal",
				},
				title: "Test file",
			},
			method: "POST",
		});
	};

	const deleteAsset = async (assetId: string) => {
		return await httpService.request<null, null>({
			url: config.urls.getDeleteAssetUrl(assetId),
			method: "DELETE",
		});
	};

	const downloadAssetFile = async (fileUrl: string) => {
		return await httpService.downloadFile({
			url: fileUrl,
			requestHeaders: [
				{
					name: "Content-type",
					value: "text/plain",
				},
			],
		});
	};

	const {
		success: uploadedBinaryFileSuccess,
		response: uploadedBinaryFileResponse,
		error: uploadedBinaryFileError,
	} = await uploadBinaryFile();

	if (!uploadedBinaryFileSuccess) {
		throw uploadedBinaryFileError;
	}

	it("Upload response status should be 200", () => {
		expect(uploadedBinaryFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Id property should be available", () => {
		expect(uploadedBinaryFileResponse.payload.id).toBeDefined();
	});

	const {
		success: addAssetSuccess,
		response: addAssetResponse,
		error: addAssetError,
	} = await addAsset(uploadedBinaryFileResponse.payload.id);

	if (!addAssetSuccess) {
		throw addAssetError;
	}

	it("Add asset response status should be 201", () => {
		expect(addAssetResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(201);
	});

	it("Url & id property should be available when adding asset", () => {
		expect(addAssetResponse.payload.id).toBeDefined();
		expect(addAssetResponse.payload.url).toBeDefined();
	});

	const {
		success: downloadedFileSuccess,
		data: downloadedFileResponse,
		error: downloadedFileError,
	} = await poll(
		async () => {
			const { success, response, error } = await downloadAssetFile(addAssetResponse.payload.url);

			if (success) {
				return { success: true, data: response };
			}

			return { success: false, error };
		},
		{
			intervalMs: 1000,
			timeoutMs: 30000,
		},
	);

	if (!downloadedFileSuccess) {
		throw downloadedFileError;
	}

	it("Download file response status should be 200", () => {
		expect(downloadedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	if (config.compareFileContents) {
		it("Content of downloaded file should be identical to original file", async () => {
			expect(await downloadedFileResponse.payload.text()).toStrictEqual(await config.fileToUpload.text());
		});
	}

	const {
		success: deletedFileSuccess,
		response: deletedFileResponse,
		error: deletedFileError,
	} = await deleteAsset(addAssetResponse.payload.id);

	if (!deletedFileSuccess) {
		throw deletedFileError;
	}

	it("Delete file response status should be 204", () => {
		expect(deletedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(204);
	});

	it("Delete file response data should be empty", () => {
		expect(deletedFileResponse.payload).toStrictEqual(null);
	});
});
