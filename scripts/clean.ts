import { deleteFolderRecursive } from './script.utils.js';

for (const path of ['dist']) {
	deleteFolderRecursive(path);
}
