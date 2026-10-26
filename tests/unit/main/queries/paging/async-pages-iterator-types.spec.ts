import { describe, expectTypeOf, it } from "vitest";
import { getDefaultHttpService } from "../../../../../lib/main/http/http.service.js";
import { createPagedFetchQuery } from "../../../../../lib/main/sdk/queries/paged-fetch-sdk-query.js";
import { getNextPageUrl, getTestSdkInfo, stubFetchWithResponse } from "../../../../../lib/testkit/testkit.utils.js";

describe("Async pages iterator types", () => {
	const query = createPagedFetchQuery({
		getNextPageData: () => ({}),
		mapMetadata: () => null,
		config: {
			httpService: getDefaultHttpService(),
		},
		sdkInfo: getTestSdkInfo(),
		schema: undefined,
		url: getNextPageUrl(0),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		mapPagingExtraResponseProps: () => ({}),
	});

	it("pages().next() value should be the response or undefined, not any", async () => {
		stubFetchWithResponse(() => Response.json(null));
		const { value } = await query.pages().next();

		expectTypeOf(value).toEqualTypeOf<Awaited<ReturnType<typeof query.fetchPage>> | undefined>();
	});

	it("pagesSafe().next() value should be the safe result or undefined, not any", async () => {
		stubFetchWithResponse(() => Response.json(null));
		const { value } = await query.pagesSafe().next();

		expectTypeOf(value).toEqualTypeOf<Awaited<ReturnType<typeof query.fetchPageSafe>> | undefined>();
	});
});
