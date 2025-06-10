import { describe, expect, it } from "vitest";
import type { HttpServiceStatus } from "../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import { getIntegrationTestConfig } from "../integration-tests.config.js";

const fileToUpload = new Blob(["core-sdk-integration-test"], { type: "text/plain" });

describe("Integration tests - Binary file / asset management", async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService({
		retryStrategy: {
			maxAttempts: 5,
			getDelayBetweenRequestsMs: (error) => {
				if (error.reason === "notFound") {
					return 1000;
				}

				return 0;
			},
			logRetryAttempt: false,
			canRetryError: (error) => {
				if (error.reason === "notFound") {
					// we intetionally retry 404 because when we upload a file and get the URL back, the file might not yet be accessible
					// and the request will fail with 404.
					return true;
				}

				return false;
			},
		},
	});

	const uploadBinaryFileAsync = async () => {
		return await httpService.uploadFileAsync<{
			readonly id: string;
		}>({
			url: config.urls.getUploadAssetBinaryFileUrl("core-sdk.txt"),
			body: fileToUpload,
			method: "POST",
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
			requestHeaders: config.getMapiAuthorizationHeaders(),
		});
	};

	const deleteAssetAsync = async (assetId: string) => {
		return await httpService.requestAsync<null, null>({
			url: config.urls.getDeleteAssetUrl(assetId),
			body: null,
			method: "DELETE",
			requestHeaders: config.getMapiAuthorizationHeaders(),
		});
	};

	const downloadAssetFileAsync = async (fileUrl: string) => {
		return await httpService.downloadFileAsync({
			url: fileUrl,
		});
	};

	const { success: uploadedBinaryFileSuccess, data: uploadedBinaryFileResponse, error: uploadedBinaryFileError } = await uploadBinaryFileAsync();

	if (!uploadedBinaryFileSuccess) {
		throw new Error("Failed to upload binary file", { cause: uploadedBinaryFileError });
	}

	it("Upload response status should be 200", () => {
		expect(uploadedBinaryFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Id property should be available", () => {
		expect(uploadedBinaryFileResponse.responseData.id).toBeDefined();
	});

	const { success: addAssetSuccess, data: addAssetResponse, error: addAssetError } = await addAssetAsync(uploadedBinaryFileResponse.responseData.id);

	if (!addAssetSuccess) {
		throw new Error("Failed to add asset", { cause: addAssetError });
	}

	it("Add asset response status should be 201", () => {
		expect(addAssetResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(201);
	});

	it("Url & id property should be available when adding asset", () => {
		expect(addAssetResponse.responseData.id).toBeDefined();
		expect(addAssetResponse.responseData.url).toBeDefined();
	});

	const {
		success: downloadedFileSuccess,
		data: downloadedFileResponse,
		error: downloadedFileError,
	} = await downloadAssetFileAsync(addAssetResponse.responseData.url);

	if (!downloadedFileSuccess) {
		throw new Error("Failed to download file", { cause: downloadedFileError });
	}

	it("Download file response status should be 200", () => {
		expect(downloadedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Content of downloaded file should be identical to original file", async () => {
		expect(await downloadedFileResponse.responseData.text()).toStrictEqual(await fileToUpload.text());
	});

	const { success: deletedFileSuccess, data: deletedFileResponse, error: deletedFileError } = await deleteAssetAsync(addAssetResponse.responseData.id);

	if (!deletedFileSuccess) {
		throw new Error("Failed to delete file", { cause: deletedFileError });
	}

	it("Delete file response status should be 204", () => {
		expect(deletedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(204);
	});

	it("Delete file response data should be empty", () => {
		expect(deletedFileResponse.responseData).toStrictEqual(null);
	});
});
