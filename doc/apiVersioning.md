# API Versioning

Api versioning is the strongest focus of this architecture, and this document aims to demonstrate how common interactions related to api version can be carried out.

## Adding new api version
1. Go to version module (*api/version.js*) and add an appropriate version name to `availableVersions` list. say `'v2'`.
    * make sure version name you added is all lowercase.
    * make sure version name is unique.
    * make sure version name only contains alphanumeric characters.
2. Next, in the api directory create a folder named the same as your version name. *api/v2/*
3. Copy everything from a pre-existing version directory, say `v1`, to `v2` folder.
4. Done.

## Changing default api version
default api version is used when there is no entry for api version in `availableVersions` (in *api/version.js*) for api version requested by client.
1. Make sure version directory exists for api version you are trying to make default. Also make sure that version is listed in `availableVersions` list (in *api/version.js*).
2. change `defaultVersion` (in *api/version.js*) to the version name you want to be default.
3. Done.

## Discarding a currently supported api version.
1. Remove entry for that version name from `availableVersions` list (in *api/version.js*).
2. Make sure that version is not `defaultVersion`, if it is change it to some other api version from `availableVersions`.
3. Optionally, completely remove that version directory from */api/* directory.
4. Done.