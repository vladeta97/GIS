    const mapTilerToken = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=90RVzabwVf6oCi81Oo0m';
    const mapTilerAttribution = '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';
    const serverBaseUrl = 'http://localhost:8080/geoserver/gis_test';
	
    const layer = {
      point: 'gis_test:planet_osm_point',
      point4326: 'gis_test:planet_osm_point_new',
      datapoint: 'gis_test:avl',
      roads: 'gis_test:planet_osm_roads_new',
      polygon: 'gis_test:planet_osm_polygon',
      polygon4326: 'gis_test:planet_osm_polygon_new',
      line: 'gis_test:planet_osm_line_new',
      pointLine: 'serbia:SerbiaMap',
	  tracks:'gis_test:tracks',
    track_points:'gis_test:track_points',
	  trek_start:'gis_test:start_point'
    }
	
    const icons = {
      policijskaStanica: L.icon({
            iconUrl: 'police-station.png',
            iconSize: [35, 35]
      }),
      start: L.icon({
        iconUrl: 'start.png',
        iconSize: [30, 30]
      }),
      cave: L.icon({
        iconUrl: 'cave.png',
        iconSize: [30, 30]
      }),
      peak: L.icon({
        iconUrl: 'peak.png',
        iconSize: [30, 30]
      }),
      waterfall: L.icon({
        iconUrl: 'waterfall.png',
        iconSize: [30, 30]
      }),
      water_source: L.icon({
        iconUrl: 'wsource.png',
        iconSize: [30, 30]
      }),spring: L.icon({
        iconUrl: 'spring.png',
        iconSize: [30, 30]
      }),
      viewpoint: L.icon({
        iconUrl: 'viewpoint.png',
        iconSize: [30, 30]
      })
    };
	
    var map = initMap();

    var theCurrentLoc = {};
    var layerControls;

    var isInsertMode = false;
    var pointClickedEvent = null;
    var polylines = [];
    var markers=[];
    var gDArray=[];
    var posOnGraphMarker;
    var isLineShown=false;
    let ms;
    let gp;

    addControls();

    function graphData(xvalue,yvalue,latlng){
      this.xvalue=xvalue;
      this.yvalue=yvalue;
      this.latlng=latlng;
    }

    createCavesLayer().then(a => {
      layerControls.addOverlay(cave, 'Pecine');
    })
    createSpringsLayer().then(a => {
      layerControls.addOverlay(spring, 'Izvor');
    })
    createPeakLayer().then(a => {
      layerControls.addOverlay(peak, 'Vrhovi');
    })
    createTrekLayer().then(a => {
      layerControls.addOverlay(start, 'Trek');
    })
    createWaterfallLayer().then(a => {
      layerControls.addOverlay(waterfall, 'Vodopad');
    })
    createWaterSourceLayer().then(a => {
      layerControls.addOverlay(drinking_water, 'Voda za pice');
    })
    createViewPointLayer().then(a => {
      layerControls.addOverlay(viewpoint, 'Vidikovac');
    })

    function onMapClicked(e) {
      if(polylines!=null){
        x=polylines.pop();
        map.removeLayer(x);
      }
      if(posOnGraphMarker!=null){
        map.removeLayer(posOnGraphMarker);
        posOnGraphMarker=null;
      }
      if (isInsertMode) {
        pointClickedEvent = e;
        addCurrLocMarker(e);
      } else {
        getFeatureInfo(e);
      }
    }

    function addCurrLocMarker(e){
        lat = e.latlng.lat;
        lon = e.latlng.lng;
        removeCurrMarker();
        theCurrentLoc = L.marker([lat,lon]).addTo(map); 
    }

    function removeCurrMarker(){
        if (theCurrentLoc != undefined) {
              map.removeLayer(theCurrentLoc);
        };
    }

    function getFeatureInfo(e) {
      var sw = map.options.crs.project(map.getBounds().getSouthWest());
      var ne = map.options.crs.project(map.getBounds().getNorthEast());
      var BBOX = sw.x + "," + sw.y + "," + ne.x + "," + ne.y;
      var WIDTH = map.getSize().x;
      var HEIGHT = map.getSize().y;

      var X = Math.trunc(map.layerPointToContainerPoint(e.layerPoint).x);
      var Y = Math.trunc(map.layerPointToContainerPoint(e.layerPoint).y);

      var URL = `${serverBaseUrl}/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layer.point}&QUERY_LAYERS=${layer.point}&BBOX=`
        + `${BBOX}&FEATURE_COUNT=1&HEIGHT=${HEIGHT}&WIDTH=${WIDTH}&INFO_FORMAT=application/json&TILED=false&CRS=EPSG:3857&I=${X}&J=${Y}`;

      callApiAndSetLayer(URL, e.latlng, presentFeaturePopup, "");
    }

    function initMap() {
      let map = L.map('map')
        .setView([44, 21], 7);
      L.tileLayer('https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=5l7zynRL91qC3yKajzKP', {
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'your.mapbox.access.token'
    }).addTo(map);
      map.on('click', onMapClicked);
      return map;
    }

    function addControls() {
      var basemaps = {
        Lokacije: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.point,
          format: 'image/png',
          transparent: true
        }),
        Linije: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.line,
          format: 'image/png',
          transparent: true
        }),
        Putevi: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.roads,
          format: 'image/png',
          transparent: true
        }),
        Oblasti: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.polygon,
          format: 'image/png',
          transparent: true
        }),
        Rute: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.datapoint,
          format: 'image/png',
          transparent: true
        }),
		    Trekovi: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.tracks,
          format: 'image/png',
          transparent: true
        })
      };
      layerControls = L.control.layers({}, basemaps, { collapsed: true, autoZIndex: false }).addTo(map);
      if (basemaps.Topography) {
        basemaps.Topography.addTo(map);
      }
    }

    function createCavesLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=natural='cave_entrance'&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var uni = data.features.map(feature =>
              markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name,  'cave')
            );
            cave = L.layerGroup(uni);
            resolve();
          }
        }, 'cave')
      });
    }

    function createSpringsLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=natural='spring'&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var uni = data.features.map(feature =>
              markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name,  'spring')
            );
            spring = L.layerGroup(uni);
            resolve();
          }
        }, 'spring')
      });
    }

    function createPeakLayer() {
      return new Promise((resolve, reject) => {
        let peakUrl = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=natural='peak'and ele between 1500 and 2500&CRS=EPSG:4326`;
        callApiAndSetLayer(peakUrl, null, function (data) {
          if (data && data.features) {
            var c = data.features.map(feature =>
              markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name,  'peak')
            );
            peak = L.layerGroup(c);
            resolve();
          }
        },'peak')
      });
    }

    function createTrekLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.trek_start}&outputformat=json&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var uni = data.features.map(feature =>
              markTrek([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name)
              
            );
            start = L.layerGroup(uni);
            resolve();
          }
        }, 'start')
        console.log(markers);
      });
    }
    
    
    function createPathLayer(e){
      console.log(e.latlng);
      for(var i=0;i<markers.length;i++){
        //console.log(markers[i][0]);
        if(markers[i][0]._latlng==e.latlng){
          var msg=markers[i][1];
          drawPath(msg)
          console.log('aaaaaa' + msg);
        }
      } 
    }

    function drawPath(msg){
      if(polylines.length!=0){
        x=polylines.pop();
        map.removeLayer(x);
      }
      return new Promise((resolve, reject) => {
        console.log(ms);
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.tracks}&outputformat=json&cql_filter=name='${msg}'&CRS=EPSG:4326`;
        var tmp=null;
        $.ajax({
          'async': false,
          'url': url,
          'dataType': "json",
          'type': "GET",
           success: function (data) {
              tmp=data
           }
        });
       // console.log(tmp.features[0])
        src=tmp.features[0].properties.src;
        n=tmp.features[0].properties.name;
        pointList=tmp.features[0].geometry.coordinates[0];
        pointList.forEach(swap);
        console.log(tmp.features);
        var firstpolyline = new L.polyline(pointList, {
            color: 'red',
            weight: 3,
            opacity: 0.5
        });
        map.fitBounds(firstpolyline.getBounds());
        firstpolyline.addTo(map);
        polylines.push(firstpolyline);
        //console.log(src +' '+ n);
        createGraph(src);
      });
    }

    function swap(data){
      x=data[0];
      data[0]=data[1];
      data[1]=x;
    }
    
    function createGraph(src){
      return new Promise((resolve, reject) => {
        let url;
        //console.log('x3');
        //console.log(src);
        url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.track_points}&outputformat=json&cql_filter=src='${src}'&CRS=EPSG:4326`;
        var tmp=null;
        $.ajax({
          'async': false,
          'url': url,
          'dataType': "json",
          'type': "GET",
           success: function (data) {
              tmp=data
           }
        });
        //console.log(tmp);
        //drawGraph(tmp);
        formGraphData(tmp);

      });
    }

    function formGraphData(data){
    var xValues=[];
    var yValues=[];
    count=0;
    count2=0;
    //console.log(data);
    var startPointLon=data.features[0].geometry.coordinates[0];
    var startPointLat=data.features[0].geometry.coordinates[1];
    gDArray=[]

    for(let i=0;i<data.totalFeatures;i+=10){

      var a=getDistanceFromLatLonInKm(startPointLat,startPointLon,data.features[i].geometry.coordinates[1],data.features[i].geometry.coordinates[0]);
      var x=Math.round(a*100)/100;
      startPointLat=data.features[i].geometry.coordinates[1];
      startPointLon=data.features[i].geometry.coordinates[0];
      count2+=x;
      
      xValues[count]=count2.toFixed(1);
      yValues[count]=data.features[i].properties.ele;
      
      gDArray.push({x:xValues[count],y:yValues[count],latlng:[data.features[i].geometry.coordinates[1],data.features[i].geometry.coordinates[0]]});
      count++;
    }
    //console.log(gDArray);
    //console.log(yValues);
    drawGraph(xValues,yValues);

    }

    function drawGraph(xV,yV){
      var xValues =xV;
    
      var yValues = yV;
      
      new Chart("myChart", {
        type: "line",
        data: {
          labels: xValues,
          datasets: [{
            data: yValues,
            fill: false,
            borderColor: "red"
          }]
        },
        options: {
          legend: {display: false},
          onClick: (event, elements, chart) => {
            console.log(elements[0]._index);
            console.log(gDArray[elements[0]._index]);
            console.log('aaaaa')

            if(posOnGraphMarker!=null){
              console.log('bbbb')
              map.removeLayer(posOnGraphMarker);
            }
            let msg="Distance: "+ gDArray[elements[0]._index].x +"km"+ "\n"+"Elevation: "+ gDArray[elements[0]._index].y+"m";
            posOnGraphMarker = L.marker(gDArray[elements[0]._index].latlng).bindPopup(msg).openPopup();
            map.addLayer(posOnGraphMarker);
          }
        }

      });
    }

    function markTrek(latlng,message){
      let ico = icons.start;
      ms=message;
      var marker = L.marker(latlng, { icon: ico}).bindPopup(message).openPopup().on('click', createPathLayer);
      mark=[marker,message]
      markers.push(mark);
      return marker;
    }

    function createWaterfallLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=waterway='waterfall'&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var w = data.features.map(feature =>
              markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name,  'waterfall')
            );
            waterfall = L.layerGroup(w);
            resolve();
          }
        }, 'waterfall')
      });
    }
    function createWaterSourceLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=amenity='drinking_water'&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var w = data.features.map(feature =>
              markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name,  'drinking_water')
            );
            drinking_water = L.layerGroup(w);
            resolve();
          }
        }, 'drinking_water')
      });
    }
    function createViewPointLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=tourism='viewpoint'&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var w = data.features.map(feature =>
              markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name,  'viewpoint')
            );
            viewpoint = L.layerGroup(w);
            resolve();
          }
        }, 'viewpoint')
      });
    }

    function filterPeaks(){
      var valueFrom=document.getElementById('filterInputFrom').value;
      var valueTo=document.getElementById('filterInputTo').value;
      if(!valueFrom || !valueTo){
        console.log('Missing values');
        return;
      }else{
        createPeakFilterLayer(valueFrom,valueTo);
      }

    }
   
    function createPeakFilterLayer(valueFrom,valueTo) {
       return new Promise((resolve, reject) => {
         let url;
         url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=natural='peak' and ele between '${valueFrom}' and '${valueTo}'&CRS=EPSG:4326`;
         let t = type;
         callApiAndSetLayer(url, null, function (data, latlng, tt) {
           if (data && data.features) {
            console.log('x4');
             var uni = data.features.map(feature =>              
               markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name, tt)           
             );
             var flag = false;
             filtered_peaks = L.layerGroup(uni);
             if(flag == true){
              console.log('x6');
               map.eachLayer((layer) => {
                 if(layer['_latlng']!=undefined)
                 layer.remove();
               })
               filtered_peaks.addTo(map);
             }
             console.log('x7');
             layerControls.addOverlay(filtered_peaks, 'Odabrani vrhovi');
             resolve(filtered_peaks);
           }
         }, 'filtered_peaks')
       });
     }

     function clearPeaksFilter(){
      map.removeLayer(filtered_peaks)
      layerControls.removeLayer(filtered_peaks);
      layerControls._update();
      document.getElementById('filterInputFrom').value=0;
      sdocument.getElementById('filterInputTo').value=0;
    }

    function callApiAndSetLayer(url, latlng, successCallback, type) {
      $.ajax({
        url: url,
        dataType: "json",
        type: "GET",
        success: function (data) {
           successCallback(data, latlng, type)
            }
      });
    }

    function presentFeaturePopup(data, latlng) { 
      if (data && data.features) {
        data.features.forEach(feature => {
          var message = Object.entries(feature.properties)
            .filter(([name, value]) => value !== null)
            .reduce(function (acc, [name, value]) {
              return acc + ' ' + name + ': ' + value + '<br>';
            }, '');
          showPopup(message, latlng);
        });

      }
    }

    function showPopup(popupMessage, latlng) {
      let popup = new L.Popup({
        maxWidth: 300
      });
      popup.setContent(popupMessage);
      popup.setLatLng(latlng);
      map.openPopup(popup);
    }

    function markFeature(latlng, message, type) {

      let ico = icons.semafor;
      if(type =='filtered_peaks'){
        ico = icons.peak;
      }else if (type == 'cave'){
        ico = icons.cave;  
      }else if (type == 'spring'){
        ico = icons.spring;  
      }else if (type == 'peak'){
        ico = icons.peak;  
      }else if (type == 'start'){
        ico = icons.start;  
      }else if (type == 'waterfall'){
        ico = icons.waterfall;  
      }else if (type == 'drinking_water'){
        ico = icons.water_source;  
      }else if (type == 'viewpoint'){
        ico = icons.viewpoint;  
      }else if (type == 'filtered_treks'){
        ico = icons.viewpoint;  
      }
      var marker = L.marker(latlng, { icon: ico}).bindPopup(message).openPopup()
      return marker;
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2-lat1);  // deg2rad below
      var dLon = deg2rad(lon2-lon1); 
      var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      var d = R * c; // Distance in km
      return d;
    }
    
    function deg2rad(deg) {
      return deg * (Math.PI/180)
    }
		
    function uploadFile(form){
      const formData = new FormData(form);
      var oReq = new XMLHttpRequest();
      oReq.open("POST", "http://127.0.0.1:5000/upload_file", true);
      oReq.onload = function(oEvent) {
        if (oReq.status == 200) {
          console.log(oReq.response)
        } else {
          console.log("error while uploading");
        }
      };
      console.log("Sending file!")
      oReq.send(formData);
    }