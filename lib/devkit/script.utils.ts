import chalk from 'chalk';
import { rmSync } from 'node:fs';

export function deleteFolderRecursive(path: string): void {
	console.log(`Deleting existing folder '${chalk.yellow(path)}'`);
	rmSync(path, {
		recursive: true,
		force: true,
	});

	console.log(`Folder '${chalk.yellow(path)}' deleted successfully`);
}
