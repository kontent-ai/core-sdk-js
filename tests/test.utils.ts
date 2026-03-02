import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import type { GetNextPageData } from "../lib/public_api.js";

export function getEnvironmentRequiredValue(variableName: string): string {
	const value = getEnvironmentOptionalValue(variableName);

	if (!value) {
		throw new Error(`Missing environment variable '${chalk.red(variableName)}'`);
	}

	return value;
}

export function getEnvironmentOptionalValue(variableName: string): string | undefined {
	loadEnvironmentVariables();
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

function loadEnvironmentVariables(): void {
	loadEnvFile(getEnvFilePath());
}

function getRootDirectory(): string {
	return path.dirname(fileURLToPath(import.meta.url));
}

function getEnvFilePath(): string {
	return path.resolve(getRootDirectory(), "..", ".env");
}
