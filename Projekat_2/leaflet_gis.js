
  var map = L.map("map").setView([43,20], 7);

  var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });

  osm.addTo(map);
 
  var basemaps = {
    Lokacije: L.tileLayer.wms('http://localhost:8080/geoserver/wms', {
        layers: 'gis_test:planet_osm_point',
		format: 'image/png',
        transparent: true
    }),

    Putevi: L.tileLayer.wms('http://localhost:8080/geoserver/wms', {
        layers: 'gis_test:planet_osm_line',
		format: 'image/png',
        transparent: true
    }),

    'Putevi i lokacije': L.tileLayer.wms('http://localhost:8080/geoserver/wms', {
        layers: ['gis_test:planet_osm_line','gis_test:planet_osm_point'],
		format: 'image/png',
        transparent: true
    }),

    'Oblasti, putevi i lokacije': L.tileLayer.wms('http://localhost:8080/geoserver/wms', {
        layers: ['gis_test:planet_osm_polygon','gis_test:planet_osm_line','gis_test:planet_osm_point'],
		format: 'image/png',
        transparent: true
    })
};

L.control.layers(basemaps).addTo(map);

basemaps.Lokacije.addTo(map);
  
  map.on('click', function(e) {        
		var URL1=getFeatureInfoUrl(e.latlng);
		console.log("url je:"+URL1)
		$.ajax({
                   url: URL1,
                   dataType: "json",
                   type: "GET",
                   success: function(data)
                   {
					    console.log("success");
                     if(data.features.length !== 0) {  
                       var returnedFeature = data.features[0];
						
                       var msg = Object.entries(returnedFeature.properties)
                                                .filter(([name, value]) => value !== null && name !== 'osm_id')
                                                .map(([name, value]) => value)
                                                .reduce(function (acc, val) {
                                                    return acc + ' ' + val
                                                    }, '');
                       var popup = new L.Popup({
							maxWidth: 300
						});
                       popup.setContent(msg);
                       popup.setLatLng(e.latlng);
                       map.openPopup(popup);
					   
					
					    var cords = document.getElementById("cords");
						cords.innerHTML= JSON.stringify(e.latlng);
                    }
                  }
                 });
	});
	
	function getFeatureInfoUrl (latlng){
        var point = map.latLngToContainerPoint(latlng, map.getZoom()),
        size = map.getSize(),
        crs = map.options.crs,
        sw = crs.project(map.getBounds().getSouthWest()),
        ne = crs.project(map.getBounds().getNorthEast()),

		params = {
			service: 'WMS',
			version:'1.3.0',
			request: 'GetFeatureInfo',
			layers: ['gis_test:planet_osm_polygon','gis_test:planet_osm_point'],
            query_layers:['gis_test:planet_osm_point','gis_test:planet_osm_polygon'],
			bbox: sw.x + ',' + sw.y + ',' + ne.x + ',' + ne.y,
			feature_count:1,
			height: size.y,
			width: size.x,
			info_format: 'application/json',
			tiled:'false',
			crs:'EPSG:3857'
		};

        params[params.version === '1.3.0' ? 'i' : 'x'] = point.x;
        params[params.version === '1.3.0' ? 'j' : 'y'] = point.y;

        return 'http://localhost:8080/geoserver/wms' + L.Util.getParamString(params, this._url, true);
    }
	
