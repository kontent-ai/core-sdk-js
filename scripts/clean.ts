import { deleteFolderRecursive } from '../lib/utils/script.utils.js';

for (const path of ['dist']) {
    deleteFolderRecursive(path);
}
