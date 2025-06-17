import { deleteFolderRecursive } from "../lib/devkit/script.utils.js";

for (const path of ["dist"]) {
	deleteFolderRecursive(path);
}
