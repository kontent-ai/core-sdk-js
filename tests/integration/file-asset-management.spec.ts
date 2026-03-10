import { describe, expect, it } from "vitest";
import type { HttpServiceStatus } from "../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import { sleep } from "../../lib/utils/core.utils.js";
import { getIntegrationTestConfig } from "../integration-tests.config.js";

const fileToUpload = new Blob(["core-sdk-integration-test"], { type: "text/plain" });

/**
 * Currently, the file contents are not being compared in the test because of changes made to Kontent.ai API
 * which causes some files to be not accessible immediately after upload. It's unclear whether this behavior
 * will be fixed in the future, so we're disabling the file content comparison for now and only check the status code.
 * Same applies for the file manually uplaoded to Kontent.ai and using the "Copy URL" feature.
 *
 * Info: The file contents come back as a Blob, but with 0 bytes.
 */
const compareFileContents: boolean = true;

describe("Integration tests - Binary file / asset management", async () => {
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
			body: fileToUpload,
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
			body: null,
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

	// It may take a bit of time for the file to be available for download
	const sleepTime = 15000;
	console.log(`Waiting ${sleepTime}ms for file to be available for download...`);
	await sleep(sleepTime);

	const {
		success: downloadedFileSuccess,
		response: downloadedFileResponse,
		error: downloadedFileError,
	} = await downloadAssetFile(addAssetResponse.payload.url);

	if (!downloadedFileSuccess) {
		throw downloadedFileError;
	}

	it("Download file response status should be 200", () => {
		expect(downloadedFileResponse.adapterResponse.status).toStrictEqual<HttpServiceStatus>(200);
	});

	if (compareFileContents) {
		it("Content of downloaded file should be identical to original file", async () => {
			expect(await downloadedFileResponse.payload.text()).toStrictEqual(await fileToUpload.text());
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
