import chalk from "chalk";
import * as dotenv from "dotenv";
import type { GetNextPageData } from "../lib/public_api.js";

// needed to load .env environment to current process when run via package.json script
dotenv.config();

export function getEnvironmentRequiredValue(variableName: string): string {
	const value = getEnvironmentOptionalValue(variableName);

	if (!value) {
		throw new Error(`Missing environment variable '${chalk.red(variableName)}'`);
	}

	return value;
}

export function getEnvironmentOptionalValue(variableName: string): string | undefined {
	return process.env[variableName];
}

export function preventInfinitePaging({
	responseIndex,
	maxPagesCount,
	continuationToken,
	nextPageUrl,
}: {
	readonly responseIndex: number;
	readonly maxPagesCount: number;
	readonly continuationToken?: string;
	readonly nextPageUrl?: string;
}): ReturnType<GetNextPageData<null, null>> {
	if (responseIndex >= maxPagesCount + 100) {
		throw new Error("Infinite paging detected");
	}

	return {
		continuationToken,
		nextPageUrl,
	};
}

export function getNextPageUrl(index: number): string {
	return `https://page-url.com/${index}`;
}
