import { describe, expect, it } from "vitest";
import z from "zod";
import type { HttpServiceStatus } from "../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
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

	const uploadBinaryFileQuery: MutationQuery<{ readonly id: string }, unknown> = createMutationQuery({
		...baseMutationConfig,
		zodSchema: z.object({
			id: z.string(),
		}),
		method: "POST",
		request: {
			url: config.urls.getUploadAssetBinaryFileUrl("core-sdk.txt"),
			body: config.fileToUpload,
		},
	});

	const addAssetQueryFactory = (binaryFileId: string): MutationQuery<{ readonly id: string; readonly url: string }, unknown> =>
		createMutationQuery({
			...baseMutationConfig,
			zodSchema: z.object({
				id: z.string(),
				url: z.string(),
			}),
			method: "POST",
			request: {
				url: config.urls.addAssetUrl,
				body: {
					file_reference: {
						id: binaryFileId,
						type: "internal" as const,
					},
					title: "Test file",
				},
			},
		});

	const deleteAssetQueryFactory = (assetId: string): MutationQuery<null, unknown> =>
		createMutationQuery({
			...baseMutationConfig,
			zodSchema: z.null(),
			method: "DELETE",
			request: {
				url: config.urls.getDeleteAssetUrl(assetId),
				body: null,
			},
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
		expect(uploadedBinaryFileResponse.meta.status).toStrictEqual<HttpServiceStatus>(200);
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
		expect(addAssetResponse.meta.status).toStrictEqual<HttpServiceStatus>(201);
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
	} = await deleteAssetQueryFactory(addAssetResponse.payload.id).executeSafe();

	if (!deletedFileSuccess) {
		throw deletedFileError;
	}

	it("Delete file response status should be 204", () => {
		expect(deletedFileResponse.meta.status).toStrictEqual<HttpServiceStatus>(204);
	});

	it("Delete file response data should be empty", () => {
		expect(deletedFileResponse.payload).toStrictEqual(null);
	});
});
