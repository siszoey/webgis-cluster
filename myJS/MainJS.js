/***
 * creator woniugis
 */
define([
    "dojo/parser",//  Dom/Widget解析包
    "esri/map",
    "esri/geometry/Extent",
    "dojo/on",
    "dijit/form/CheckBox",
    "esri/dijit/HomeButton",
    "esri/dijit/Scalebar",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/fx",
    "dojo/_base/array",
    "esri/request",
    "esri/SpatialReference",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/renderers/HeatmapRenderer",
    "esri/toolbars/navigation",
    "esri/dijit/PopupTemplate",
    "esri/geometry/Point",
    "esri/geometry/webMercatorUtils",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/renderers/ClassBreaksRenderer",
    /*"myJS/TDTTilesLayer",*/
    "myJS/ClusterLayer",
    "dojo/domReady!"
], function (parser, Map, Extent, on, CheckBox, HomeButton, Scalebar, dom, DomStyle, Domattr, fx, arrayUtils, esriRequest, SpatialReference,
             ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer, FeatureLayer, GraphicsLayer, HeatmapRenderer,
             navigation, PopupTemplate, Point, webMercatorUtils,
             SimpleMarkerSymbol, SimpleFillSymbol, PictureMarkerSymbol, ClassBreaksRenderer,
             ClusterLayer) {
    return {
        map: 0,
        maping: function () {
            //dojo/parser,parse()用于解析页面上所有的小部件，扫描DOM以查找类实例，并实例化它们。搜索data-dojo-type =“Class”或dojoType =“Class”
            parser.parse();
            /*var initialExtent = new Extent({
             "xmax": 109.2, "ymax": 35.6,
             "xmin": 106.7, "ymin": 34.1
             });*/
            map = new Map("mapDiv", {
                showLabels: true,
                logo: false,
                slider: false,//影藏缩放按钮
                center: [108.4, 34.8],
                zoom: 9
                //extent: initialExtent
            });


            var homebtn = new HomeButton({
                map: map
            }, "HomeButton");
            homebtn.startup();

            //初始化比例尺
            var scalebar = new Scalebar({
                map: map,
                // "dual" displays both miles and kilometers
                // "english" is the default, which displays miles
                // use "metric" for kilometers
                scalebarUnit: "dual"
            });
            $(".esriScalebarLine").css({"border-color": "#8dbcc2"});
            $(".esriScalebarLabel").css({"color": "#41626a"});
            scalebar.show();

            /**
             * 加载天地图底图服务(TDTTilesLayer.js)
             * "img"表示加载影像数据，"cia"为影像标注，"vec"为矢量地图,"cva"为矢量标注
             */
            /*var tiledimg = new TDTTilesLayer("img");
             var tiledcia = new TDTTilesLayer("cia");
             map.addLayers([tiledimg, tiledcia]);*/
            /**
             * 部署的时候把这些代码放开把上面两行代码注释
             **/
            var xy_TDTImg = new ArcGISTiledMapServiceLayer("http://1.85.55.27:8080/YouMapServer/rest/service/SxImgMap/bhDH52tgCaAb4gHY/TileServer");
            var xy_TDTImgLabel = new ArcGISTiledMapServiceLayer("http://1.85.55.27:8080/YouMapServer/rest/service/SxImgLabelMap/z3WB1K-Q0-mooFCE/TileServer");
            map.addLayers([xy_TDTImg, xy_TDTImgLabel]);
            var lq = new ArcGISDynamicMapServiceLayer("http://10.63.22.16:6080/arcgis/rest/services/Tiled/XY_cityline/MapServer");
            map.addLayer(lq);
            /*var xy_TDTImg = new ArcGISTiledMapServiceLayer("http://10.63.22.16:6080/arcgis/rest/services/Tiled/XY_ImgMap/MapServer");
             var xy_TDTImgLabel = new ArcGISTiledMapServiceLayer("http://10.63.22.16:6080/arcgis/rest/services/Tiled/XY_ImgMapLabel/MapServer");

             map.addLayers([xy_TDTImg, xy_TDTImgLabel]);*/

            /***
             * 通过ajax获取JSON串的公共方法
             *
             */

            function getJson(url) {
                if (url == null)
                    return;
                var json;
                $.ajaxSettings.async = false;//同步执行
                $.getJSON(url, function (data) {
                    json = data;
                });
                $.ajaxSettings.async = true;//异步执行
                return json;
            }

            /***
             * 热力图实现：
             * 热力图的颜色方案可按照需求自己设置
             * 热力图的本质是FeatureLayer点图层，通过获取Json中的位置点，创建FeatureLayer，之后通过ArcGIS api中的HeatmapRenderer类渲染FeatureLayer图层
             */
            //添加热力图渲染

            function heatmapFeatureLayers(url) {
                var heatmapRender = new HeatmapRenderer(
                    {
                        colors: ["rgba(0,0,255,0)", "rgb(255,0,0)", "rgb(255,150,0)", "rgb(255,255,0)"],
                        blurRadius: 8,
                        maxPixelIntensity: 10,
                        minPixelIntensity: 1
                    });
                var layerDefinition = {
                    "geometryType": "esriGeometryPoint",
                    "fields": [{
                        "name": "ID",
                        "type": "esriFieldTypeInteger",
                        "alias": "ID"
                    }]
                };
                var featureCollection = {
                    layerDefinition: layerDefinition,
                    featureSet: null
                };
                var featureLayer = new esri.layers.FeatureLayer(featureCollection, {
                    showLables: true
                });
                //获取json中点的坐标
                var json = getJson(url);
                for (var i = 0; i < json.RECORDS.length; i++) {
                    var x = json.RECORDS[i].POORLON;
                    var y = json.RECORDS[i].POORLAT;
                    var point = new esri.geometry.Point(x, y, new esri.SpatialReference({wkid: 4326}));//初始化起点
                    //将点添加到FeatureLayer图层就会显示出热力图
                    featureLayer.add(new esri.Graphic(point));//添加点渲染热力图
                }
                //设置渲染方式
                featureLayer.setRenderer(heatmapRender);
                return featureLayer;
            }

            /**
             * 加载热力图
             * @param target
             */
                //定义图层变量
            var heatmapfeatureLayer = null;

            function heatmapCommonCode(tempUrl) {
                if (heatmapfeatureLayer != null) {
                    map.removeLayer(heatmapfeatureLayer);
                    heatmapfeatureLayer = null;
                } else {
                    heatmapfeatureLayer = heatmapFeatureLayers(tempUrl);
                    map.addLayer(heatmapfeatureLayer);
                }

            }

            //加载聚类信息图
            var clusterLayer = null;

            function clusterCommonCode(tempUrl) {
                if (clusterLayer != null) {
                    map.removeLayer(clusterLayer);
                    clusterLayer = null;
                }
                /***
                 * poorData.then(func1(),func2())
                 * 请求成功时相应函数func1，请求失败时，相应函数func2
                 */
                var poorData = esriRequest({
                    url: tempUrl,
                    handleAs: "json"
                });
                poorData.then(addClusters, error);
            }

            on(dom.byId("poor_jk"), "click", function () {
                var tempUrl = "data/脱贫户/健康/健康.json"
                clusterCommonCode(tempUrl)
            });
            on(dom.byId("poor_db"), "click", function (temp) {
                var tempUrl = "data/贫困户/健康情况/患有大病.json"
                clusterCommonCode(tempUrl)
            });
            on(dom.byId("poor_cj"), "click", function (temp) {
                var tempUrl = "data/贫困户/健康情况/残疾.json"
                clusterCommonCode(tempUrl)
            });
            on(dom.byId("poor_mxb"), "click", function (temp) {
                var tempUrl = "data/贫困户/健康情况/长期慢性病.json"
                clusterCommonCode(tempUrl)
            });

            /**
             * 产业情况：
             * A:总体产业分布情况--热力图、聚类图
             * B:不同产业分布情况--
             */
            on(dom.byId("cy_heatmap"), "click", function () {
                var tempUrl = "data/产业/产业总体.json";
                heatmapCommonCode(tempUrl);
            });
            on(dom.byId("cy_cluster"), "click", function () {
                var tempUrl = "data/产业/产业总体.json";
                clusterCommonCode(tempUrl);
            });
            on(dom.byId("cy_yzy"), "click", function () {
                var tempUrl = "data/产业/养殖业.json";
                clusterCommonCode(tempUrl);
            });
            on(dom.byId("cy_zzy"), "click", function () {
                var tempUrl = "data/产业/种植业.json";
                clusterCommonCode(tempUrl);
            });
            on(dom.byId("cy_ly"), "click", function () {
                var tempUrl = "data/产业/林业.json";
                clusterCommonCode(tempUrl);
            });
            on(dom.byId("cy_lvy"), "click", function () {
                var tempUrl = "data/产业/旅游业.json";
                clusterCommonCode(tempUrl);
            });
            on(dom.byId("cy_jgy"), "click", function () {
                var tempUrl = "data/产业/加工业.json";
                clusterCommonCode(tempUrl);
            });
            on(dom.byId("cy_gffd"), "click", function () {
                var tempUrl = "data/产业/光伏发电.json";
                clusterCommonCode(tempUrl);
            });
            on(dom.byId("cy_qtcy"), "click", function () {
                var tempUrl = "data/产业/其它产业.json";
                clusterCommonCode(tempUrl);
            });
            /***
             * 定义样式
             * @type {{markerSymbol: *, marginLeft: string, marginTop: string}}
             */
            /***
             * 贫困信息点聚类分析
             */
            function addClusters(resp) {
                var poorInfo = {};
                var wgs = new SpatialReference({
                    "wkid": 4326
                });
                /**
                 * dojo/-base/array
                 * arrayUtiles.map()可以灵活处理循环问题
                 * 因为json数据在list[]下，所以这里使用resp.list
                 */
                var tempRecorlds = [];
                arrayUtils.map(resp.RECORDS, function (p) {
                   if(p.POORLON != null){
                       tempRecorlds.push(p)
                    }
                })
                poorInfo = arrayUtils.map(tempRecorlds, function (p) {
                    var latlng = new Point(parseFloat(p.POORLON), parseFloat(p.POORLAT), wgs);
                        var webMercator = webMercatorUtils.geographicToWebMercator(latlng);
                        var attributes = {
                            "地区": p.AREA_DESC,
                            "所在村": p.VILLAGE_NAME,
                            "村主导产业类型": p.村主导产业类型,
                            "主导产业带动户数（户）": p.主导产业带动户数,
                            "主导产业带动收益（元）": p.主导产业带动收益,
                            "新型经营主体带动总户数（户）": p.新型经营主体带动总户数,
                            "新型经营主体带动总收入（元）": p.新型经营主体带动总收入,
                            "VR": p.VRURL
                        };
                        return {
                            "x": webMercator.x,
                            "y": webMercator.y,
                            "attributes": attributes
                        };
                });
                // popupTemplate to work with attributes specific to this dataset
                var popupTemplate = new PopupTemplate({
                    "title": "产业信息",
                    "fieldInfos": [{
                        "fieldName": "地区",
                        visible: true
                    }, {
                        "fieldName": "所在村",
                        visible: true
                    }, {
                        "fieldName": "村主导产业类型",
                        visible: true
                    }, {
                        "fieldName": "主导产业带动户数（户）",
                        visible: true
                    }, {
                        "fieldName": "主导产业带动收益（元）",
                        visible: true
                    }, {
                        "fieldName": "新型经营主体带动总户数（户）",
                        visible: true
                    }, {
                        "fieldName": "新型经营主体带动总收入（元）",
                        visible: true
                    }, {
                        "fieldName": "VR",
                        visible: true
                    }]
                });

                // 调用构造函数创建图层
                clusterLayer = new ClusterLayer({
                    "data": poorInfo,
                    "distance": 50,
                    "id": "clusters",
                    "labelColor": "#fff",
                    "labelOffset": 10,
                    "singleColor": "#888",
                    "singleTemplate": popupTemplate,
                    "spatialReference": new SpatialReference({"wkid": 4326})
                });

                /**
                 * 其中defaultSym是在break断层（如果一开始是从2到20的话，那么0到2的渲染符号就是defaultSym）时的渲染图形，
                 * 也是定义ClassBreaksRenderer必须要有的参数。
                 */
                var defaultSym = new SimpleMarkerSymbol().setSize(4);
                var renderer = new ClassBreaksRenderer(defaultSym, "clusterCount");
                var blue = new PictureMarkerSymbol("Libs/img/BluePin.png", 56, 56).setOffset(0, 15);
                var green = new PictureMarkerSymbol("Libs/img/GreenPin.png", 64, 64).setOffset(0, 15);
                var red = new PictureMarkerSymbol("Libs/img/RedPin.png", 72, 72).setOffset(0, 15);
                renderer.addBreak(0, 2, blue);
                renderer.addBreak(2, 50, green);
                renderer.addBreak(50, 1000000, red);

                clusterLayer.setRenderer(renderer);
                map.addLayer(clusterLayer);

                // close the info window when the map is clicked
                map.on("click", cleanUp);
                // close the info window when esc is pressed
                map.on("key-down", function (e) {
                    if (e.keyCode === 27) {
                        cleanUp();
                    }
                });
            }

            function cleanUp() {
                map.infoWindow.hide();
                clusterLayer.clearSingles();
            }

            function error(err) {
                console.log("something failed: ", err);
            }

            // show cluster extents...
            // never called directly but useful from the console
            window.showExtents = function () {
                var extents = map.getLayer("clusterExtents");
                if (extents) {
                    map.removeLayer(extents);
                }
                extents = new GraphicsLayer({id: "clusterExtents"});
                var sym = new SimpleFillSymbol().setColor(new Color([205, 193, 197, 0.5]));

                arrayUtils.forEach(clusterLayer._clusters, function (c, idx) {
                    var e = c.attributes.extent;
                    extents.add(new Graphic(new Extent(e[0], e[1], e[2], e[3], map.spatialReference), sym));
                }, this);
                map.addLayer(extents, 0);
            };


        }
    }
});

/*
 *	显示综合应用模块
 *@author fmm 2015-06-09
 */
function showApplyContainer() {
    // $("#coverLayer").show("slow");
    $(".selfTabs").css("opacity", "1");
    $(".closeDiv").css("opacity", "1");
    $(".selfTabs").show("slow");
    $(".closeDiv").show("slow");
}

/*
 *	隐藏综合应用模块
 *@author fmm 2015-06-11
 */
function hideApplyContainer() {
    // $("#coverLayer").hide("slow");
    $(".selfTabs").hide("slow");
    $(".closeDiv").hide("slow");
}
function logout() {
    window.location.href = "./login.html";
}