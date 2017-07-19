/// <reference types="node" />
import { DBClient } from "sakura-node-3";
/**
 * 初始化参数
 */
export interface MapnikServiceOptions {
    client: DBClient;
}
/**
 * 坐标系
 */
export declare enum SpatialReference {
    WGS84 = 0,
}
/**
 * Mapnik 对 MySQL 的兼容性支持
 *
 * Usage:
 *  MapnikService.init({client: client, spatialReference: SpatialReference.WGS84}); // 其中 client 为初始化过的 DBClient
 *  const pbf: Buffer = await MapnikService.queryTileAsPbf("lands", ["owner", "displayName"], 3, 7, 5);
 */
export declare class MapnikService {
    private static client_;
    private static spatialReference_;
    /**
     * 初始化 service
     * @param options 可选参数
     */
    static init(options: MapnikServiceOptions): Promise<void>;
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
    static queryTileAsPbf(tableName: string, layerName: string, geomFieldName: string, fields: string[], z: number, x: number, y: number, compression?: "none" | "gzip"): Promise<Buffer>;
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
    private static queryFeaturesAsGeoJson_(tableName, layerName, geomFieldName, fields, z, x, y);
    /**
     * 转为 Mapnik 需要的 GeoJSON Feature Collection 格式
     * @param result QueryResult
     * @returns {GeoJsonFeatureCollection} GeoJSON Feature Collection
     * @private
     */
    private static queryResultToFeatureCollection_(result);
    /**
     * 根据坐标系给出 MySQL 创建 spa_ref_sys 表的 sql
     * @param spf 坐标系
     * @returns {string} 插入的 SQL
     * @private
     */
    private static spaRefSysReplaceSql_(spf);
    /**
     * 转出坐标系的 string 表达式
     * @private
     */
    private static proj4StringFromSpatialReference_(spf);
}
