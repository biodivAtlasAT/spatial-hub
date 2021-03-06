(function (angular) {
    'use strict';
    /**
     * @memberof spApp
     * @ngdoc service
     * @name ToolExportChecklistService
     * @description
     *   Client side tool to export list of species in an occurrence layer
     */
    angular.module('tool-export-checklist-service', [])
        .factory("ToolExportChecklistService", ["$http", "$q", "MapService", "BiocacheService", "LayoutService",
            function ($http, $q, MapService, BiocacheService, LayoutService) {
                var _this = {
                    // Override text with view-config.json
                    spec: {
                        "input": [
                            {
                                "description": $i18n(418),
                                "type": "area",
                                "constraints": {
                                    "min": 1,
                                    "max": 1,
                                    "defaultToWorld": false
                                }
                            },
                            {
                                "description": $i18n(411),
                                "type": "speciesOptions",
                                "constraints": {
                                    "areaIncludes": false,
                                    "kosherIncudes": true,
                                    "endemicIncludes": true
                                }
                            }],
                        "description": $i18n(426)
                    },

                    downloading: false,
                    downloadSize: 0,

                    init: function () {
                        _this.downloading = false;
                        _this.downloadSize = 0;
                    },

                    execute: function (inputs) {
                        var area = inputs[0];
                        var speciesOptions = inputs[1];

                        var q = [];
                        var wkt = undefined;
                        if (area[0].q && (area[0].q.length > 0)) {
                            q = area[0].q
                        } else if (area[0].wkt.length > 0) {
                            q = ['*:*'];
                            wkt = area[0].wkt;
                        }

                        if (speciesOptions.spatiallyValid && speciesOptions.spatiallySuspect) q = q.concat(["geospatial_kosher:*"]);
                        else if (speciesOptions.spatiallyValid) q = q.concat(["geospatial_kosher:true"]);
                        else if (speciesOptions.spatiallySuspect) q = q.concat(["geospatial_kosher:false"]);
                        else q = q.concat(["-geospatial_kosher:*"]);

                        var query = BiocacheService.newQuery(q, '', wkt);

                        var future;

                        var showPreview = false;
                        if (showPreview) {
                            _this.downloading = true;
                            _this.cancelDownload = $q.defer();

                            var config = {
                                eventHandlers: {
                                    progress: function (c) {
                                        _this.downloadSize = c.loaded
                                    }
                                },
                                timeout: _this.cancelDownload.promise
                            };

                            future = speciesOptions.includeEndemic ? BiocacheService.speciesListEndemic(query, undefined, config) :
                                BiocacheService.speciesList(query, undefined, config);

                            future.then(function (data) {
                                _this.openCsv(data, speciesOptions.includeEndemic);
                                _this.cancelDownload.resolve();
                            })
                        } else {
                            if (_this.cancelDownload) _this.cancelDownload.resolve();
                            future = _this.endemic ? BiocacheService.speciesListEndemicUrl(query) :
                                BiocacheService.speciesListUrl(query);

                            future.then(function (url) {
                                Util.download(url);
                            })
                        }
                    },

                    openCsv: function (csv, endemic) {
                        LayoutService.openModal('csv', {
                            title: (endemic ? $i18n(427, "Endemic") + ' ' : '') + $i18n(428, "Species List"),
                            csv: csv,
                            columnOrder: ['Species Name',
                            'Vernacular Name',
                            'Number of records',
                            'Conservation',
                            'Invasive'],
                            info: '',
                            filename: (endemic ? 'endemicS' : 's') + 'peciesList.csv',
                            display: {size: 'full'}
                        }, false)
                    }
                };

                return _this
            }])
}(angular));
