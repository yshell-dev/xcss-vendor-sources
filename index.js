import fs from "fs/promises"; // Use fs.promises for async operations
import path from "path";
// Removed HappyDOM import as the HTML bake step was removed in the last user prompt.

// --- Options ---

const options = {
    minify: true,
    explode: false,
    deployZero: false,
    pseudosVersion: true,
}

const publicFolder = "public";
const privateFolder = "private";
const websiteFolder = "website";

console.log("\n🚀 Build script started.");


// --- Helpers ---

/**
 * Deep merges two objects.
 * @param {object} target - The target object to merge into.
 * @param {object} source - The source object to merge from.
 * @returns {object} The merged object.
 */
function deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const targetValue = output[key];
            const sourceValue = source[key];

            if (
                typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue) &&
                typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)
            ) {
                output[key] = deepMerge(targetValue, sourceValue);
            }
            else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                output[key] = targetValue.concat(sourceValue);
            }
            else {
                output[key] = sourceValue;
            }
        }
    }
    return output;
}

/**
 * Asynchronously copies a folder and its contents.
 * @param {string} source - The source folder path.
 * @param {string} destination - The destination folder path.
 */
async function copyFolder(source, destination) {
    try {
        await fs.mkdir(destination, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error(`Error creating destination folder '${destination}':`, error);
            throw error;
        }
    }

    const files = await fs.readdir(source);
    await Promise.all(files.map(async file => {
        const sourcePath = path.join(source, file);
        const destinationPath = path.join(destination, file);
        const stats = await fs.stat(sourcePath);

        if (stats.isFile()) {
            await fs.copyFile(sourcePath, destinationPath);
        } else if (stats.isDirectory()) {
            await copyFolder(sourcePath, destinationPath); // Recursive call
        }
    }));
}

/**
 * Asynchronously checks for and creates missing files in a folder.
 * @param {string} folderPath - The folder path to check.
 * @param {string[]} files - An array of file names expected in the folder.
 */
async function fillFolder(folderPath, files) {
    await Promise.all(files.map(async file => {
        const filePath = path.join(folderPath, file);
        try {
            await fs.access(filePath); // Check if file exists
        } catch (error) {
            if (error.code === 'ENOENT') { // File does not exist
                await fs.writeFile(filePath, '{}');
            } else {
                console.error(`Error accessing file '${filePath}':`, error);
                throw error;
            }
        }
    }));
}

/**
 * Asynchronously saves an object to a versioned folder structure.
 * @param {string} destination - The base destination path.
 * @param {string} versionName - The name of the version folder.
 * @param {object} prefixesObject - The object containing data to save.
 */
async function saveForEnvironment(destination, versionName, prefixesObject = {}) {
    const modifiedObject = options.pseudosVersion
        ? Object.entries(prefixesObject).reduce((acc, [group, object]) => {
            if (["classes", "elements"].includes(group)) {
                deepMerge(acc.pseudos, object);
            } else {
                acc[group] = object;
            }
            return acc;
        }, { pseudos: {} })
        : prefixesObject;

    try {
        await fs.mkdir(destination, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error(`Error creating version folder '${destination}':`, error);
            throw error;
        }
    }
    const versionJsonPath = path.join(destination, `${versionName}.json`);
    await fs.writeFile(versionJsonPath, JSON.stringify(modifiedObject, null, options.minify ? 0 : 2));

    if (options.explode) {
        if (modifiedObject.pseudos) {
            prefixesObject.pseudos = modifiedObject.pseudos
        }
        const versionFolderPath = path.join(destination, versionName);
        try {
            await fs.mkdir(versionFolderPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                console.error(`Error creating version folder '${versionFolderPath}':`, error);
                throw error;
            }
        }
        await Promise.all(Object.entries(prefixObjects).map(async ([fileName, object]) => {
            const filePath = path.join(versionFolderPath, `${fileName}.json`);
            await fs.writeFile(filePath, JSON.stringify(object, null, minify ? 0 : 2));
        }));
    }
}


// --- Main Execution ---

async function main() {
    const indexTable = {};
    const indexTablePath = path.join(publicFolder, "index.json");


    // Clean up public folder
    console.log(`\n🧹 Cleaning up public folder: '${publicFolder}'...`);
    try {
        const filesInPublic = await fs.readdir(publicFolder);
        await Promise.all(filesInPublic.map(async file => {
            const filePath = path.join(publicFolder, file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                await fs.unlink(filePath);
            } else if (stats.isDirectory()) {
                await fs.rm(filePath, { recursive: true, force: true });
            }
        }));
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`Public folder '${publicFolder}' does not exist, skipping cleanup.`);
        } else {
            console.error(`Error during public folder cleanup:`, err);
            throw err;
        }
    }
    console.log(`✅ Public folder cleanup complete.`);


    // Copy web assets
    console.log(`\n📂 Copying web assets to public folder...`);
    await copyFolder(websiteFolder, publicFolder);
    console.log(`✅ Web assets copied.`);


    // Initialize 'zero' version JSON collection
    const jsonCollection = {
        "atrules": {},
        "attributes": {},
        "classes": {},
        "elements": {},
        "values": {},
    };

    if (options.deployZero) {
        console.log("\n📦 Initializing 'zero' version of JSON collection.");
        await saveForEnvironment(publicFolder, "zero", jsonCollection);
        console.log("✅ 'zero' version created.");
    }


    // Process private folder environments
    console.log(`\n🌐 Processing private folder: '${privateFolder}'...`);
    const expectedFiles = Object.fromEntries(Object.keys(jsonCollection).map(file => [`${file}.json`, file]));
    const envs = await fs.readdir(privateFolder);

    await Promise.all(envs.map(async env => {
        const envPrivatePath = path.join(privateFolder, env);
        const envPublicPath = path.join(publicFolder, env);

        let stats;
        try {
            stats = await fs.lstat(envPrivatePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`\tSkipping non-existent environment path: '${envPrivatePath}'`);
                return;
            }
            throw error;
        }

        if (stats.isDirectory()) {
            console.log(`\t➡️ Processing environment: '${env}'`);

            const fileObjects = Object.keys(jsonCollection).reduce((acc, key) => {
                acc[key] = {};
                return acc;
            }, {});

            let previousYearIndex = 0;
            indexTable[env] = { from: {}, last: {} };

            const versions = (await fs.readdir(envPrivatePath)).reverse();

            for (const version of versions) {
                const versionPrivatePath = path.join(envPrivatePath, version);

                let versionStats;
                try {
                    versionStats = await fs.lstat(versionPrivatePath);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        console.warn(`\tSkipping non-existent version path: '${versionPrivatePath}'`);
                        continue;
                    }
                    throw error;
                }

                if (versionStats.isDirectory()) {
                    previousYearIndex++;

                    await fillFolder(versionPrivatePath, Object.keys(expectedFiles));

                    Object.keys(expectedFiles).forEach(async file => {
                        const filePath = path.join(versionPrivatePath, file);
                        try {
                            const result = JSON.parse(await fs.readFile(filePath, 'utf8'));
                            fileObjects[expectedFiles[file]] = deepMerge(fileObjects[expectedFiles[file]], result);
                        } catch (error) {
                            console.error(`\t\tError processing file '${filePath}':`, error);
                            throw error;
                        }
                    });

                    const last = previousYearIndex.toString().padStart(4, '0');
                    const lastPath = `last-${last}`;
                    const fromPath = `from-${version}`;

                    await saveForEnvironment(envPublicPath, fromPath, fileObjects);
                    await saveForEnvironment(envPublicPath, lastPath, fileObjects);

                    indexTable[env].from[fromPath] = [env, `${fromPath}.json`].join("/");
                    indexTable[env].last[lastPath] = [env, `${lastPath}.json`].join("/");
                }
            }
            console.log(`\t✅ Finished processing environment: '${env}'.`);
        }
    }));
    console.log(`✅ All private folder environments processed.`);


    // Write final indexTable
    console.log(`\n✍️ Writing final indexTable to: '${indexTablePath}'`);
    await fs.writeFile(indexTablePath, JSON.stringify(indexTable, null, options.minify ? 0 : 2));
    console.log(`✅ indexTable written.`);


    console.log("\n🎉 Build script finished successfully!");
}


// Execute the main async function
main()
    .catch(error => {
        console.error("\n❌ Build script terminated with an error:", error);
        process.exit(1); // Exit with a non-zero code to indicate failure
    })
    .finally(() => {
        console.log("")
    });
