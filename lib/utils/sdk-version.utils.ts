import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'node:fs';

const sdkVersionPlaceholderMacro = '{{version}}';

export function replaceSdkVersionPlaceholder(filePath: string, version: string): void {
	const fileContent = readFileSync(filePath, 'utf8');

	if (!fileContent.includes(sdkVersionPlaceholderMacro)) {
		throw Error(`File '${filePath}' does not contain macro '${sdkVersionPlaceholderMacro}'`);
	}

	writeFileSync(filePath, fileContent.replace(sdkVersionPlaceholderMacro, version));

	console.log(`Updated SDK version in '${chalk.yellow(filePath)}' to '${chalk.green(version)}'`);
}
