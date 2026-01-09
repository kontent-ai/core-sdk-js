import { describe, expect, it } from "vitest";
import type { HttpServiceStatus } from "../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import { sleepAsync } from "../../lib/utils/core.utils.js";
import { getIntegrationTestConfig } from "../integration-tests.config.js";

const fileToUpload = new Blob(["core-sdk-integration-test"], { type: "text/plain" });

describe("Integration tests - Binary file / asset management", async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService({
		retryStrategy: {
			maxRetries: 5,
			getDelayBetweenRetriesMs: (error) => {
				if (error.details.reason === "notFound") {
					return 1000;
				}

				return 0;
			},
			logRetryAttempt: false,
			canRetryError: (error) => {
				if (error.details.reason === "notFound") {
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

	const {
		success: uploadedBinaryFileSuccess,
		response: uploadedBinaryFileResponse,
		error: uploadedBinaryFileError,
	} = await uploadBinaryFileAsync();

	if (!uploadedBinaryFileSuccess) {
		throw new Error(`Failed to upload binary file`, { cause: uploadedBinaryFileError });
	}

	it("Upload response status should be 200", () => {
		expect(uploadedBinaryFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Id property should be available", () => {
		expect(uploadedBinaryFileResponse.data.id).toBeDefined();
	});

	const {
		success: addAssetSuccess,
		response: addAssetResponse,
		error: addAssetError,
	} = await addAssetAsync(uploadedBinaryFileResponse.data.id);

	if (!addAssetSuccess) {
		throw new Error("Failed to add asset", { cause: addAssetError });
	}

	it("Add asset response status should be 201", () => {
		expect(addAssetResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(201);
	});

	it("Url & id property should be available when adding asset", () => {
		expect(addAssetResponse.data.id).toBeDefined();
		expect(addAssetResponse.data.url).toBeDefined();
	});

	// It may take a bit of time for the file to be available for download
	await sleepAsync(5000);

	const {
		success: downloadedFileSuccess,
		response: downloadedFileResponse,
		error: downloadedFileError,
	} = await downloadAssetFileAsync(addAssetResponse.data.url);

	if (!downloadedFileSuccess) {
		throw new Error("Failed to download file", { cause: downloadedFileError });
	}

	it("Download file response status should be 200", () => {
		expect(downloadedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	it("Content of downloaded file should be identical to original file", async () => {
		expect(await downloadedFileResponse.data.text()).toStrictEqual(await fileToUpload.text());
	});

	const {
		success: deletedFileSuccess,
		response: deletedFileResponse,
		error: deletedFileError,
	} = await deleteAssetAsync(addAssetResponse.data.id);

	if (!deletedFileSuccess) {
		throw new Error("Failed to delete file", { cause: deletedFileError });
	}

	it("Delete file response status should be 204", () => {
		expect(deletedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(204);
	});

	it("Delete file response data should be empty", () => {
		expect(deletedFileResponse.data).toStrictEqual(null);
	});
});
