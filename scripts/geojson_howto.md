# How-to

Extract gml features into geojson files

## Prequisites

1. Extract gml-zip files to a folder

2. Copy and / or modify `scripts/gml2geojson.config.ts` to suit your needs

    - SOURCE_DIR

    - DEST_DIR

    - DEST_FILE_PREFIX

3. Run extraction:

    - Directly: `bun ./scripts/gml2geojson.bun.ts`

    - Via package.json: `(p)npm run gml2geojson`

4. Test the resluting geojson-files in QGIS to see if they fit your needs.