import { rmSync } from "node:fs";
import { colorize } from "./console.utils.js";

export function deleteFolderRecursive(path: string): void {
	console.log(`Deleting existing folder '${colorize("yellow", path)}'`);
	rmSync(path, {
		recursive: true,
		force: true,
	});

	console.log(`Folder '${colorize("yellow", path)}' deleted successfully`);
}
