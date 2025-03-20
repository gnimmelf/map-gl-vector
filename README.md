# MapGlHurdal

## Coordinate Systems

- WGS84 (EPSG:4326)

    - Default for GeoJson files, and implicit for newer versions

    - Coordinate System: Geographic coordinate system (GCS).

    - Units: Degrees of latitude and longitude.

    - Description: WGS84 is a global standard coordinate system used by GPS. Coordinates are expressed in degrees of latitude (north/south) and longitude (east/west), which represent positions on the Earth's surface as if it were a sphere.

    - Use Case: WGS84 is typically used for storing raw geographic coordinates. It is the default in many geographic datasets and is required by standards like GeoJSON.

- Web Mercator (EPSG:3857)

    - Coordinate System: Projected coordinate system (PCS).

    - Units: Meters.

    - Description: Web Mercator projects the Earth’s surface onto a flat, two-dimensional plane using the Mercator projection. Instead of latitude and longitude, it uses x and y coordinates in meters. This projection distorts areas near the poles but preserves angles, making it useful for maps where visualizing shapes and distances (within reasonable latitudes) is more important than size accuracy.

    - Use Case: Web Mercator is commonly used in web mapping applications (e.g., Google Maps, OpenStreetMap, Bing Maps) because it allows for seamless panning and zooming.

- GeoNorge uses UTM (Universal Transverse Mercator)

    - Sone 32N: EPSG:25832 - Dekker det meste av Sør-Norge.

    - Sone 33N: EPSG:25833 - Dekker deler av Øst-Norge.

    - Sone 35N: EPSG:25835 - Brukes for Øst-Finnmark.


### Conversions

- [proj4js](http://proj4js.org/)

- `ogr2ogr` from [GDAL](https://www.gdal.org/)

    - This one won't work properly for `SOSI`-type files (which is what `Geonorge.no` exports everything from, I think, and so their files contain lot's of custom properties)


## Formats

GeoJson can be converted to THREE.js polygons.

[GeoJson-valiator](https://www.itb.ec.europa.eu/json/geojson/upload)


### GeoNorge.no

Mapdata sets. Add to downloads, and proceed to "checkout". Select:

- Kartdata [N50 Kartdata](https://kartkatalog.geonorge.no/metadata/n50-kartdata/ea192681-d039-42ec-b1bc-f3ce04c189ac)

    - `Geografisk område`: "Hurdal"

    - `Projeksjon`: "Utm sone 32" (Or UTM33)

    - `Format`: "GML"

- DEM (Digital Elevation Model) - "Digital TerrengModell 10": [DTM10UTM32](https://kartkatalog.geonorge.no/metadata/dtm-10-terrengmodell-utm32/fd851873-f363-46f9-9fc6-bb1b403575df)


# scripts/gml2geojson

Extract zip to a folder and copy and / or modify `scripts/gml2geojson.config.ts` to suit your needs, then run:

```
bun run scripts/gml2geojson2.bun.ts
```

Test the resluting geojson-files in QGIS to see if they fit your needs.
