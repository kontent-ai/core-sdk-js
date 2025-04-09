import chalk from 'chalk';
import fs, { rmSync } from 'fs';

export function createVersionFile({
    filePath,
    propertyName,
    packageName,
    packageVersion
}: {
    readonly filePath: string;
    readonly propertyName: string;
    readonly packageName: string;
    readonly packageVersion: string;
}): void {
    console.log(chalk.cyan(`\nCreating version file at '${filePath}' with prop '${propertyName}'`));
    console.log(chalk.green(`Updating version ${chalk.yellow(packageVersion)}`));

    const src = `
export const ${propertyName} = {
    host: 'npmjs.com',
	name: '${packageName}',
    timestamp: '${new Date().toUTCString()}',
    version: '${packageVersion}'
};
`;

    console.log(`${chalk.green('Writing version to ')}${chalk.yellow(filePath)}\n`);
    fs.writeFileSync(filePath, src, { flag: 'w' });
}

export function deleteFolderRecursive(path: string): void {
    console.log(`Deleting existing folder '${chalk.yellow(path)}'`);
    rmSync(path, {
        recursive: true,
        force: true
    });

    console.log(`Folder '${chalk.yellow(path)}' deleted successfully`);
}
