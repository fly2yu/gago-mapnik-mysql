"use strict";
// Copyright 2017 huteng (huteng@gagogroup.com). All rights reserved.,
// Use of this source code is governed a license that can be found in the LICENSE file.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const proj4 = require("proj4");
const sakura_node_3_1 = require("sakura-node-3");
const proj4_1 = require("proj4");
let mapnik = require("mapnik");
/**
 * 坐标系
 */
var SpatialReference;
(function (SpatialReference) {
    SpatialReference[SpatialReference["WGS84"] = 0] = "WGS84";
})(SpatialReference = exports.SpatialReference || (exports.SpatialReference = {}));
/**
 * Mapnik 对 MySQL 的兼容性支持
 *
 * Usage:
 *  MapnikService.init({client: client, spatialReference: SpatialReference.WGS84}); // 其中 client 为初始化过的 DBClient
 *  const pbf: Buffer = await MapnikService.queryTileAsPbf("lands", ["owner", "displayName"], 3, 7, 5);
 */
class MapnikService {
    /**
     * 初始化 service
     * @param options 可选参数
     */
    static init(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = options.client;
            MapnikService.client_ = client;
            MapnikService.spatialReference_ = SpatialReference.WGS84;
            // MySQL 依赖 spatial_ref_sys 表来索引坐标系，故在初始化时应建表并插入数据
            //  SRID int(11)
            //  AUTH_NAME varchar(256)
            //  AUTH_SRID int(11)
            //  SRTEXT varchar(2048)
            const createTableSql = `CREATE TABLE IF NOT EXISTS spatial_ref_sys
(
    SRID INT(11) PRIMARY KEY NOT NULL,
    AUTH_NAME VARCHAR(256),
    AUTH_SRID INT(11),
    SRTEXT VARCHAR(2048)
);
CREATE UNIQUE INDEX spatial_ref_sys_SRID_uindex ON spatial_ref_sys (SRID);`;
            //await client.query(createTableSql);
            // 根据用户指定的坐标系加入
            //const replaceSql: string = MapnikService.spaRefSysReplaceSql_(options.spatialReference);
            //await client.query(replaceSql);
        });
    }
    /**
     * 根据 Google 瓦片行列号查询数据并将其转为 pbf 返回
     * @param tableName 数据库表名
     * @param fields 需要查询的列名
     * @param z Tile Zoom Level
     * @param x Tile X
     * @param y Tile Y
     * @param compression 压缩，默认不压缩，如果压缩可以支持 gzip
     * @returns {Promise<Buffer>} pbf 流
     */
    static queryTileAsPbf(tableName, layerName, geomFieldName, fields, z, x, y, compression = "none") {
        return __awaiter(this, void 0, void 0, function* () {
            // 查询 Polygon 并返回 GeoJSON 格式
            let result = yield MapnikService.queryFeaturesAsGeoJson_(tableName, layerName, geomFieldName, fields, z, x, y);
            // 转为 GeoJSON Feature Collection 的格式
            let featureCollection = MapnikService.queryResultToFeatureCollection_(result);
            // 使用 Mapnik 转 pbf
            return new Promise((resolve, reject) => {
                mapnik.register_datasource((path.join(mapnik.settings.paths.input_plugins, "geojson.input")));
                let vt = new mapnik.VectorTile(z, x, y);
                vt.addGeoJSON(JSON.stringify(featureCollection), layerName, {});
                vt.toGeoJSONSync(0);
                vt.getData({
                    compression: compression,
                    level: 9,
                    strategy: "FILTERED"
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    /**
     *
     * @param tableName
     * @param fields
     * @param z
     * @param x
     * @param y
     * @returns {Promise<QueryResult>}
     * @private
     */
    static queryFeaturesAsGeoJson_(tableName, layerName, geomFieldName, fields, z, x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            let vt = new mapnik.VectorTile(z, x, y);
            let extent = vt.extent();
            // TODO(lin.xiaoe.f@gmail.com): 暂时只支持墨卡托
            let firstProjection = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs";
            let secondProjection = MapnikService.proj4StringFromSpatialReference_(MapnikService.spatialReference_);
            let leftDown = proj4(firstProjection, secondProjection, [extent[0], extent[1]]);
            let rightUp = proj4(firstProjection, secondProjection, [extent[2], extent[3]]);
            let leftUp = proj4(firstProjection, secondProjection, [extent[0], extent[3]]);
            let rightDown = proj4(firstProjection, secondProjection, [extent[2], extent[1]]);
            // 闭合的 POLYGON
            const coordinates = [...leftDown, ...leftUp, ...rightUp, ...rightDown, ...leftDown];
            let polygon = `'POLYGON((${coordinates[0]} ${coordinates[1]}, 
                                                          ${coordinates[2]} ${coordinates[3]},  
                                                          ${coordinates[4]} ${coordinates[5]}, 
                                                          ${coordinates[6]} ${coordinates[7]},    
                                                          ${coordinates[8]} ${coordinates[9]}))'`;
            let where = `st_Contains(GeomFromText(${polygon}, ${MapnikService.spatialReference_}), ${geomFieldName}) or st_overlaps(GeomFromText(${polygon}, ${MapnikService.spatialReference_}), ${geomFieldName})`;
            const query = new sakura_node_3_1.SelectQuery().fromTable(tableName).select([`ST_AsGeoJSON(${geomFieldName}) AS geojson`, ...fields]).where(where);
            return yield MapnikService.client_.query(query);
        });
    }
    /**
     * 转为 Mapnik 需要的 GeoJSON Feature Collection 格式
     * @param result QueryResult
     * @returns {GeoJsonFeatureCollection} GeoJSON Feature Collection
     * @private
     */
    static queryResultToFeatureCollection_(result) {
        let features = [];
        for (let row of result.rows) {
            let geoJson = JSON.parse(row["geojson"]);
            // delete row["SHAPE"];
            delete row["geojson"];
            let columnGeoInfo = {
                "type": "Feature",
                "properties": row,
                "geometry": geoJson
            };
            features.push(columnGeoInfo);
        }
        return {
            "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
            "type": "FeatureCollection",
            "features": features
        };
    }
    /**
     * 根据坐标系给出 MySQL 创建 spa_ref_sys 表的 sql
     * @param spf 坐标系
     * @returns {string} 插入的 SQL
     * @private
     */
    static spaRefSysReplaceSql_(spf) {
        if (spf === SpatialReference.WGS84) {
            return `REPLACE INTO spatial_ref_sys (SRID, AUTH_NAME, AUTH_SRID, SRTEXT) VALUES (${proj4_1.WGS84}, null, null, 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]');`;
        }
        else {
            throw new Error("Unknown spatial reference");
        }
    }
    /**
     * 转出坐标系的 string 表达式
     * @private
     */
    static proj4StringFromSpatialReference_(spf) {
        if (spf === SpatialReference.WGS84) {
            return `+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs`;
        }
        else {
            throw new Error("Unknown spatial reference");
        }
    }
}
exports.MapnikService = MapnikService;

//# sourceMappingURL=index.js.map
