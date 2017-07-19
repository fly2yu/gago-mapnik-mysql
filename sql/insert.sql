CREATE TABLE IF NOT EXISTS spatial_ref_sys
(
    SRID INT(11) PRIMARY KEY NOT NULL,
    AUTH_NAME VARCHAR(256),
    AUTH_SRID INT(11),
    SRTEXT VARCHAR(2048)
);
CREATE UNIQUE INDEX spatial_ref_sys_SRID_uindex ON spatial_ref_sys (SRID);



INSERT INTO spatial_ref_sys (SRID, AUTH_NAME, AUTH_SRID, SRTEXT) VALUES
(0, null, null,
'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]');