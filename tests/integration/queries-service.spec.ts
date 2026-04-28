import { describe, expect, it } from "vitest";
import z from "zod";
import type { HttpStatusCode } from "../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import type { KontentSdkError } from "../../lib/public_api.js";
import { createMutationQuery } from "../../lib/sdk/queries/mutation-sdk-query.js";
import type { MutationQuery } from "../../lib/sdk/sdk-models.js";
import { getTestSdkInfo, poll } from "../../lib/testkit_api.js";
import { getIntegrationTestConfig } from "../integration-tests.config.js";

describe("Integration tests covering Fetch/Mutation queries against the Kontent.ai API", async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService({
		requestHeaders: config.getMapiAuthorizationHeaders(),
		retryStrategy: {
			maxRetries: 5,
		},
	});

	const baseMutationConfig = {
		config: {
			httpService,
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
	} as const;

	const uploadBinaryFileQuery: MutationQuery<{ readonly id: string }, unknown, unknown, KontentSdkError> = createMutationQuery({
		...baseMutationConfig,
		zodSchema: z.object({
			id: z.string(),
		}),
		method: "POST",
		url: config.urls.getUploadAssetBinaryFileUrl("core-sdk.txt"),
		body: config.fileToUpload,
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	const addAssetQueryFactory = (
		binaryFileId: string,
	): MutationQuery<{ readonly id: string; readonly url: string }, unknown, unknown, KontentSdkError> =>
		createMutationQuery({
			...baseMutationConfig,
			zodSchema: z.object({
				id: z.string(),
				url: z.string(),
			}),
			method: "POST",
			url: config.urls.addAssetUrl,
			body: {
				file_reference: {
					id: binaryFileId,
					type: "internal" as const,
				},
				title: "Test file",
			},
			mapError: (error) => error,
			mapExtraResponseProps: () => ({}),
		});

	const deleteAssetQueryFactory = (assetId: string): MutationQuery<null, unknown, unknown, KontentSdkError> =>
		createMutationQuery({
			...baseMutationConfig,
			zodSchema: z.null(),
			method: "DELETE",
			url: config.urls.getDeleteAssetUrl(assetId),
			body: null,
			mapError: (error) => error,
			mapExtraResponseProps: () => ({}),
		});

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
	} = await uploadBinaryFileQuery.executeSafe();

	if (!uploadedBinaryFileSuccess) {
		throw uploadedBinaryFileError;
	}

	it("Upload response status should be 200", () => {
		expect(uploadedBinaryFileResponse.meta.status).toStrictEqual<HttpStatusCode>(200);
	});

	it("Id property should be available", () => {
		expect(uploadedBinaryFileResponse.payload.id).toBeDefined();
	});

	const {
		success: addAssetSuccess,
		response: addAssetResponse,
		error: addAssetError,
	} = await addAssetQueryFactory(uploadedBinaryFileResponse.payload.id).executeSafe();

	if (!addAssetSuccess) {
		throw addAssetError;
	}

	it("Add asset response status should be 201", () => {
		expect(addAssetResponse.meta.status).toStrictEqual<HttpStatusCode>(201);
	});

	it("Url & id property should be available when adding asset", () => {
		expect(addAssetResponse.payload.id).toBeDefined();
		expect(addAssetResponse.payload.url).toBeDefined();
	});

	// The Kontent.ai API may return a file that is not yet fully accessible immediately after upload —
	// the file contents may come back as a Blob with 0 bytes. Poll until the file has > 0 bytes.
	const {
		success: downloadedFileSuccess,
		data: downloadedFileResponse,
		error: downloadedFileError,
	} = await poll(
		async () => {
			const { success, response, error } = await downloadAssetFile(addAssetResponse.payload.url);

			if (!success) {
				return { success: false, error };
			}

			if (response.payload.size === 0) {
				return { success: false, error: new Error("Downloaded file has 0 bytes") };
			}

			return { success: true, data: response };
		},
		{
			intervalMs: 1000,
			timeoutMs: 60000,
		},
	);

	if (!downloadedFileSuccess) {
		throw downloadedFileError;
	}

	it("Download file response status should be 200", () => {
		expect(downloadedFileResponse.adapterResponse.status).toStrictEqual<HttpStatusCode>(200);
	});

	it("Content of downloaded file should be identical to original file", async () => {
		expect(await downloadedFileResponse.payload.text()).toStrictEqual(await config.fileToUpload.text());
	});

	const {
		success: deletedFileSuccess,
		response: deletedFileResponse,
		error: deletedFileError,
	} = await deleteAssetQueryFactory(addAssetResponse.payload.id).executeSafe();

	if (!deletedFileSuccess) {
		throw deletedFileError;
	}

	it("Delete file response status should be 204", () => {
		expect(deletedFileResponse.meta.status).toStrictEqual<HttpStatusCode>(204);
	});

	it("Delete file response data should be empty", () => {
		expect(deletedFileResponse.payload).toStrictEqual(null);
	});
});
