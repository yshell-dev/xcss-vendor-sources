import fs from 'fs';
import path from 'path';

const SRC = "./src";
const OUT = "./out";
const VIEW = "./view";

/**
 * Clears the target directory and publishes the content of the fileMap into it.
 * * @param {Record<string, string>} fileMap - An object where keys are relative file paths 
 * (e.g., 'src/component.js') and values are the file contents (strings).
 * @param {string} targetDir - The path to the folder where files should be published.
 */
function publishPathContent(fileMap, targetDir) {
    // 1. Resolve the target directory path
    const destDir = path.resolve(targetDir);

    console.log(`Starting publish process to: ${destDir}`);

    // --- 2. Clear/Recreate Target Directory ---
    try {
        // Use recursive: true, force: true for robust deletion
        if (fs.existsSync(destDir)) {
            fs.rmSync(destDir, { recursive: true, force: true });
            console.log(`Successfully cleared existing directory: ${targetDir}`);
        }

        // Recreate the directory
        fs.mkdirSync(destDir, { recursive: true });

    } catch (error) {
        console.error(`ERROR: Failed to clear or create directory ${targetDir}.`, error.message);
        throw error;
    }

    // --- 3. Write Files ---
    let filesWritten = 0;

    for (const relativePath in fileMap) {
        if (!fileMap.hasOwnProperty(relativePath)) continue;

        const content = fileMap[relativePath];

        // Construct the full destination path
        const absoluteDestPath = path.join(destDir, relativePath);

        // Ensure the file's parent directory exists
        const parentDir = path.dirname(absoluteDestPath);
        fs.mkdirSync(parentDir, { recursive: true });

        try {
            // Write the string content to the file
            fs.writeFileSync(absoluteDestPath, content, { encoding: 'utf8' });
            filesWritten++;
        } catch (error) {
            console.error(`ERROR: Failed to write file ${relativePath}.`, error.message);
            // Decide whether to throw or continue based on severity
            throw error;
        }
    }

    console.log(`\n✅ Publish complete. Wrote ${filesWritten} files.`);
}

/**
 * Recursively generates a nested object tree for a given directory,
 * including only parsed JSON files.
 * - Directories are represented as nested objects.
 * - JSON files (.json) are parsed and represented as key-value pairs 
 * where the value is the resulting JavaScript object/array.
 * - All other files are ignored.
 * * @param {string} dirPath - The absolute or relative path to the directory.
 * @returns {object} The nested JavaScript object representing the JSON file structure.
 */
function createJsonObjectTree(dirPath) {
    const tree = {};

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        if(item.startsWith(".")) {
            continue;
        }

        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            const subTree = createJsonObjectTree(fullPath);
            if (Object.keys(subTree).length > 0) {
                tree[item] = subTree;
            }

        } else if (stats.isFile() && item.endsWith('.json')) {
            try {
                const contentString = fs.readFileSync(fullPath, { encoding: 'utf8' });
                tree[item] = JSON.parse(contentString);

            } catch (error) {
                console.error(`Error reading or parsing JSON file: ${fullPath}. Skipping.`);
                console.error(`Details: ${error.message}`);
            }
        }
    }

    return tree;
}

function createFileTree(dirPath) {
    const tree = {};

    // 1. Get all items in the directory
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            const subTree = createJsonObjectTree(fullPath);
            if (Object.keys(subTree).length > 0) {
                tree[item] = subTree;
            }

        } else if (stats.isFile()) {
            const contentString = fs.readFileSync(fullPath, { encoding: 'utf8' });
            tree[item] = contentString;
        }
    }

    return tree;
}

/**
 * Inverses an object by switching the order of the 1st and 2nd level nested keys.
 * * @param {object} originalObject The object to inverse.
 * @returns {object} The new inverted object.
 */
function inverseNestedObject(originalObject) {
    const inverted = {};

    // 1. Iterate over the keys of the first level (Level 1)
    for (const level1Key in originalObject) {
        if (!originalObject.hasOwnProperty(level1Key)) {
            continue;
        }

        const level2Object = originalObject[level1Key];

        // Ensure the value is an object before proceeding
        if (typeof level2Object !== 'object' || level2Object === null) {
            console.warn(`Skipping non-object value for key: ${level1Key}`);
            continue;
        }

        // 2. Iterate over the keys of the second level (Level 2)
        for (const level2Key in level2Object) {
            if (!level2Object.hasOwnProperty(level2Key)) {
                continue;
            }

            const value = level2Object[level2Key];

            // 3. Construct the inverted structure

            // If Level 2 key doesn't exist in the inverted object, initialize it
            if (!inverted[level2Key]) {
                inverted[level2Key] = {};
            }

            // 4. Assign the Level 1 key as a property of the Level 2 key's new object
            // The value remains the same.
            inverted[level2Key][level1Key] = value;
        }
    }

    return inverted;
}

/**
 * Recursively merges two or more objects deeply.
 * NOTE: This function does NOT handle merging arrays—it replaces them.
 * * @param {object} target - The object to merge into (will be mutated).
 * @param {object[]} sources - One or more objects to merge from.
 * @returns {object} The merged target object.
 */
function deepMerge(target, ...sources) {
    // Return the target if no sources are provided
    if (!sources.length) return target;

    // Get the first source object
    const source = sources.shift();

    // Iterate over all keys in the source object
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = target[key];

            // Check if both the target and source values are objects (and not null or array)
            const isObject = val => typeof val === 'object' && val !== null && !Array.isArray(val);

            if (isObject(sourceValue) && isObject(targetValue)) {
                // If both are objects, recurse (deep merge)
                deepMerge(targetValue, sourceValue);
            } else if (isObject(sourceValue)) {
                // If only the source value is an object, copy it deeply to prevent mutation issues
                // We use JSON.parse(JSON.stringify(sourceValue)) for a quick, but performant, deep copy
                target[key] = JSON.parse(JSON.stringify(sourceValue));
            } else {
                // Otherwise, simply assign the source value (overwriting any non-object target value)
                target[key] = sourceValue;
            }
        }
    }

    // If there are more sources, call the function recursively
    return deepMerge(target, ...sources);
}

// --- Main Execution ---
try {
    // Set the target directory path. Change 'my-config-folder' to your desired folder name.
    const SRC_DIR = path.resolve(SRC);

    if (!fs.existsSync(SRC_DIR)) {
        console.error(`Error: Directory not found at ${SRC_DIR}`);
        process.exit(1);
    }

    console.log(`Generating object tree for JSON files in: ${SRC_DIR}`);

    // Generate the tree
    const objectTree = createJsonObjectTree(SRC_DIR);
    const switched = Object.entries(objectTree).reduce((o0, [k0, v0]) => {

        o0[k0] = Object.entries(inverseNestedObject(v0)).reduce((o1, [k1, v1]) => {

            o1[k1] = Object.entries(inverseNestedObject(v1)).reduce((o2, [k2, v2]) => {

                o2[k2] = Object.entries(inverseNestedObject(v2)).reduce((o3, [k3, v3]) => {
                    o3[k3] = (k2 === "values.json") ? inverseNestedObject(v3) : v3;
                    console.log(v3)
                    return o3
                }, {})

                return o2;
            }, {})

            return o1;
        }, {})

        return o0;
    }, {})

    const filemaps = {
        "atrules.json": "atrules",
        "attributes.json": "attributes",
        "classes.json": "classes",
        "elements.json": "elements",
        "values.json": "values",
    }

    const indexmap = {};
    const finalfiles = createFileTree(VIEW);
    Object.entries(switched).forEach(([platform, years]) => {
        indexmap[platform] = {
            from: {},
            last: {}
        }

        Object.keys(years).reverse().reduce((o1, year, index) => {
            deepMerge(o1, Object.entries(years[year]).reduce((o2, [group, v2]) => {
                if (filemaps[group]) {
                    o2[filemaps[group]] = v2;
                    return o2;
                }
            }, {}))
            const fromfilename = `${platform}/from-${year.padStart(4, "0")}`;
            const lastfilename = `${platform}/last-${(index + 1).toString().padStart(4, "0")}`;
            indexmap[platform]["from"][String(year)] = fromfilename;
            indexmap[platform]["last"][`${String(index+1)} year`] = lastfilename;
            finalfiles[fromfilename] = JSON.stringify(o1);
            finalfiles[lastfilename] = JSON.stringify(o1);
            return o1
        }, {})
    },)

    finalfiles["index.json"] = JSON.stringify(indexmap)
    publishPathContent(finalfiles, OUT)

} catch (error) {
    console.error('\nAn unexpected error occurred:', error.message);
    process.exit(1);
}