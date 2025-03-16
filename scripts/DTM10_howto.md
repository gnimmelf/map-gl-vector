# How-to

Cropping DTM10 tif-tiles to an area across multiple tiles

## Prequisites

1. A geojson-polygon of an area `area.geojson`

2. DTM10 (UTM32/UTM33) tif-tiles covering the area you want to map

3. GDAL - `brew install gdal`


## Steps

0. Change directory to where the tif-tile-files are located

1. Get bounds of area `ogrinfo -al -so area.geojson`

    - The geojson must be a polygon of the area!

    - Look for "Corner Coordinates" or "extent" in the output =>

        - Extent: (xmin, ymin) - (xmax, ymax)

        - Corner Coordinates

            - Upper Left (xmin, ymax)

            - Lower Left (xmin, ymin)

            - Upper Right (xmax, ymax)

            - Lower Right (xmax, ymin)

2. Use bounds to extract a crop of the DTM10 tif-tiles

    For each of the tiles, extract the parts of the area that intersects the tile:

    ```
    gdalwarp -te [minX] [minY] [maxX] [maxY] -cutline [area.geojson] -crop_to_cutline [input_tileXX.tif] [out_tile_XX.tif]
    ```

    E.g:
    ```
    gdalwarp -te 10.66698710844047 60.33636918184986 11.147280359235149 60.51791684203125 -cutline ./assets/geojson/hurdal_kommuneområde.geojson -crop_to_cutline 6702_2_10m_z33.tif out_tile_6602_2.tif
    ```

3. Merge cropped tiles

    Get the `nodata`-value from one of the cropped files `gdalinfo [out_tile_6602_2.tif]`. This value should be a negative number.

    ```
    gdal_merge -o [out_merged.tif] [out_tile_XX.tif] [out_tile_YY.tif] -n [nodata value] -a_nodata -9999
    ```

    E.g
    ```
    gdal_merge -o output_merged.tif out_tile_6602_1.tif out_tile_6702_2.tif -n -32767 -a_nodata -9999
    ```

4. Convert the merged file to a smaller, more managable `GeoTIFF`-file

    ```
    gdal_translate -of GTiff output_merged.tif output_geotiff.tif
    ```


5. Reproject to WGS84 (EPSG:4326)

    ```
    gdalwarp -t_srs EPSG:4326 output_geotiff.tif output_final.tif
    ```

6. Check that you got it right

    Drop the merged file into QGIS along with the area.geojson-polygon and see that they overlap.

    Fileinfo:
    ```
    gdalinfo output_final.tif
    ```
