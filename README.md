# xcss-vendors: Contributor Guide

This repository serves as the master repository to manage vendor prefixes for XCSS.

## 🤝 Contributions and Integration

If you are a vendor provider and want to have your vendor data set integrated, please follow these steps:

1. **Clone the Template:**  
   Clone the official template repository [`yshell-dev/xcss-vendor-template`](https://github.com/yshell-dev/xcss-vendor-template) to your own account and begin structuring your vendor data according to the guidelines below.

2. **Create an Issue:**  
   Once your repository is ready, create a new issue in the main xcss-vendors repository with the following details:  
   - **Platform:** State the platform your contribution is for (e.g., browser by default).
   - **Vendor Prefix:** Specify the vendor prefix (e.g., `o`, `ms`, `moz`, `webkit`).
   - **Request:** Explicitly request that your new repository be added as a submodule.

3. **Verification:**  
   Core maintainers will review your repository’s structure and content against the guidelines.

4. **Submodule Addition:**  
   Upon successful verification, your repository will be added as a submodule to xcss-vendors.

## ⚙️ Repository Structure and Data Guidelines

Your repository must comply with the following rules to ensure proper export and integration:

1. **File Inclusion and Exclusion**  
   - **Ignored Items:** All hidden files and folders (starting with `.`) will be ignored during export.
   - **File Type:** Only files ending with `.json` will be processed for export. All other files will be ignored.

2. **Prefix Grouping by Year**  
   Data must be organized into folders representing the year the prefixes were introduced or updated.
   - **Year Folder Format:** Group all prefixes for a specific year within a folder named in `YYYY` format (e.g., `2024`, `2025`).
   - **Template:** Use the `.year` folder as a structural guide. When adding data for a new year, copy the `.year` folder and rename it to the appropriate four-digit year.

## 🗂 Example Contributor Directory Structure

Prefixes must be categorized by their CSS domain within each year’s folder:

```

/
├── 2024/
│   ├── atrules.json
│   ├── attributes.json
│   ├── classes.json
│   ├── elements.json
│   └── values.json
├── 2025/
│   ├── atrules.json
│   ├── attributes.json
│   ├── classes.json
│   ├── elements.json
│   └── values.json
└── .year/  <-- Use this as the structural template
    ├── atrules.json
    ├── attributes.json
    ├── classes.json
    ├── elements.json
    └── values.json

```

## ⚖️ Licensing

All contributions and the entire contents of this repository are governed by the attached license.

The license file (`LICENSE` or `LICENSE.txt`) located at the repository root **MUST NOT** be modified under any circumstances. Any attempt to alter the licensing terms will result in rejection of the contribution.
