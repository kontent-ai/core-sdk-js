import { readFileSync, writeFileSync } from "node:fs";
import { colorize } from "../devkit/console.utils.js";

const sdkVersionPlaceholderMacro = "{{version}}";

export function replaceSdkVersionPlaceholder(filePath: string, version: string): void {
	const fileContent = readFileSync(filePath, "utf8");

	if (!fileContent.includes(sdkVersionPlaceholderMacro)) {
		throw new Error(`File '${filePath}' does not contain macro '${sdkVersionPlaceholderMacro}'`);
	}

	writeFileSync(filePath, fileContent.replace(sdkVersionPlaceholderMacro, version));

	console.log(`Updated SDK version in '${colorize("yellow", filePath)}' to '${colorize("green", version)}'`);
}
