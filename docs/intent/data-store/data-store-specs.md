# Data Store Specs

EARS requirements for the data-store segment. Design: [data-store-design.md](data-store-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet covered by tests (all current specs describe behavior observed in code but untested), `[D]` deferred.

## Environment Folders

- [ ] **STORE-001**: While the `ENV` environment variable is `prod`, the data store shall read and write data files in `src/assets/data-prod/`.
- [ ] **STORE-002**: While the `ENV` environment variable is not `prod`, the data store shall read and write data files in `src/assets/data/`.

## File Access

- [ ] **STORE-003**: When a data file is read, the data store shall return the file's contents parsed as JSON.
- [ ] **STORE-004**: If a data file cannot be read or parsed as JSON, then the data store shall log the error and return no data to the caller.
- [ ] **STORE-005**: When a data file is written, the data store shall replace the file's entire contents with the given data serialized as 2-space-indented JSON.
- [ ] **STORE-006**: The data store shall perform data file reads and writes only in server-side code.

## Configuration API

- [ ] **STORE-API-001**: When `/api/configs` receives a GET request, the system shall return the full contents of `configs.json`.
- [ ] **STORE-API-002**: If `/api/configs` receives a GET request and `configs.json` cannot be read, then the system shall respond with 404 Not Found.
- [ ] **STORE-API-003**: When `/api/configs` receives a POST request with a JSON body, the system shall replace the contents of `configs.json` with that body.
