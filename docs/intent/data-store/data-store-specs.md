# Data Store Specs

EARS requirements for the data-store segment. Design: [data-store-design.md](data-store-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Environment Folders

- [ ] **STORE-001**: While the `DATA_DIR` environment variable is unset and the `ENV` environment variable is `prod`, the data store shall read and write data files in `src/assets/data-prod/`.
- [ ] **STORE-002**: While the `DATA_DIR` environment variable is unset and the `ENV` environment variable is not `prod`, the data store shall read and write data files in `src/assets/data/`.
- [ ] **STORE-011**: While the `DATA_DIR` environment variable is set, the data store shall read and write data files in the folder it names, regardless of `ENV`.

## File Access

- [ ] **STORE-003**: When a data file is read, the data store shall return the file's contents parsed as JSON.
- [ ] **STORE-004**: If a data file cannot be read or parsed as JSON, then the data store shall log the error and return no data to the caller.
- [ ] **STORE-005**: When a data file is written, the data store shall replace the file's entire contents with the given data serialized as 2-space-indented JSON.
- [ ] **STORE-006**: The data store shall perform data file reads and writes only in server-side code.
- [ ] **STORE-007**: If writing a data file fails, then the data store shall log the error and raise it to the caller.
- [ ] **STORE-008**: When a data file is written, the data store shall write the new contents to a temporary file in the same folder and then rename it over the target file.
- [ ] **STORE-009**: If writing a data file fails at any point, then the data store shall leave the target file with its previous contents.
- [ ] **STORE-010**: When two or more read-change-write updates target the same data file, the data store shall run them one at a time in arrival order, each starting from the contents the previous one wrote.

## Configuration API

- [ ] **STORE-API-001**: When `/api/configs` receives a GET request, the system shall return the full contents of `configs.json`.
- [ ] **STORE-API-002**: If `/api/configs` receives a GET request and `configs.json` cannot be read, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **STORE-API-003**: When `/api/configs` receives a POST request whose JSON body passes validation, the system shall write `configs.json` with each top-level key present in the body (`categories`, `routines`) replaced by the body's value and every other key kept unchanged.
- [ ] **STORE-API-004**: When `/api/configs` receives a POST request, the system shall validate each of `categories` and `routines` present in the body — `categories` against the usage segment's category rules, `routines` against the routines segment's routine rules — before writing.
- [ ] **STORE-API-005**: If any part of a POST body to `/api/configs` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [ ] **STORE-API-006**: If any part of a POST body to `/api/configs` fails validation, then the system shall leave `configs.json` unchanged.
- [ ] **STORE-API-007**: If a POST body to `/api/configs` contains a top-level key other than `categories` and `routines`, then the system shall treat the body as failing validation.
- [ ] **STORE-API-008**: If a POST to `/api/configs` cannot complete because `configs.json` or `usage.json` cannot be read, or `configs.json` cannot be written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **STORE-API-009**: If a POST to `/api/configs` cannot complete because `configs.json` or `usage.json` cannot be read, or `configs.json` cannot be written, then the system shall leave `configs.json` unchanged.
