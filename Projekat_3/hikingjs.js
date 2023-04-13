    const mapTilerToken = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=90RVzabwVf6oCi81Oo0m';
    const mapTilerAttribution = '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';
    const serverBaseUrl = 'http://localhost:8080/geoserver/gis_test';
	
    const icons = {
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
        iconSize: [20, 20]
      }),
      viewpoint: L.icon({
        iconUrl: 'viewpoint.png',
        iconSize: [30, 30]
      })
    };

    const layer = {
      point: 'gis_test:planet_osm_point',
      point4326: 'gis_test:planet_osm_point_new',
      datapoint: 'gis_test:avl',
      roads: 'gis_test:planet_osm_roads_new',
      polygon: 'gis_test:planet_osm_polygon',
      polygon4326: 'gis_test:planet_osm_polygon_new',
      line: 'gis_test:planet_osm_line_new',
	    tracks:'gis_test:tracks',
	    track_points:'gis_test:track_points',
	    trek_start:'gis_test:start_point',
      created_tracks:'gis_test:created_tracks'
    }
	
    var map = initMap();

    var theCurrentLoc = {};
    var layerControls;

    var isInsertMode = false;
    var calculateDistance=false;
    var createTrack=false;
    var pointClickedEvent = null;
    var previous=null;
    var polylines = [];
    var distancelines=[];
    var markers=[];
    var gDArray=[];
    var distancArray=[];
    var createdTrack=[];
    var createdTrackdistance=0;

    var posOnGraphMarker;
    var isLineShown=false;
    let ms;
    let gp;
    var myChr;

    addControls();

    createCavesLayer().then(a => {
      layerControls.addOverlay(cave, 'Pecine');
    })
    createAlpineHutLayer().then(a => {
      layerControls.addOverlay(hut, 'Planinarski dom');
    })

    createNationalParkLayer().then(a => {
      layerControls.addOverlay(park, 'Park');
    })
    createPeakLayer().then(a => {
      layerControls.addOverlay(peak, 'Vrhovi u nacionalnim parkovima');
    })
    createTracksNationalParks().then(a => {
      layerControls.addOverlay(voda, 'Staze u nacionalnim parkovima');
    })
    createWaterSourcesNearTracks().then(a=>{
      layerControls.addOverlay(voda2,'Staze koje prolaze blizu izvora');
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

    function graphData(xvalue,yvalue,latlng){
      this.xvalue=xvalue;
      this.yvalue=yvalue;
      this.latlng=latlng;
    }

    function onMapClicked(e) {
     
      if (isInsertMode) {
        pointClickedEvent = e;
        addCurrLocMarker(e);
      } else {
        getFeatureInfo(e);
      }

      if(createTrack){
       addCurrLocMarker(e);
       createdTrack.push(e.latlng);
       console.log(createdTrack);
       if(createdTrack.length>1){
        r=distanceBetweenTrackPoints(createdTrack[createdTrack.length-1],createdTrack[createdTrack.length-2]);
        createdTrackdistance+=r;
        x=document.getElementById('distanceTrack');
        x.innerHTML=createdTrackdistance;
        console.log(createdTrack[createdTrack.length-1])
        console.log(r);
      }
      }

      if(calculateDistance){
        pointClickedEvent = e;
        distancArray.push(e)
        if(distancArray.length==2){
          distanceBetweenPoints();
        }
        addCurrLocMarker(e);
      } else {
        getFeatureInfo(e);
      }

      if(distancArray.length>2){
        x=distancelines.pop();
        console.log(distancelines);
        map.removeLayer(x);
      }

	   if(polylines.length>0){
        x=polylines.pop();
        map.removeLayer(x);
       
        if(myChr!=null){
          myChr.destroy();
        }
       
      }
	    else{
		  console.log("CLICK");
	     }
	    if(posOnGraphMarker!=null){
        map.removeLayer(posOnGraphMarker);
        posOnGraphMarker=null;
      }
      if(calculateDistance==false && distancArray.length>0){
        b=distancArray.pop();
        map.removeLayer(b);
        console.log(distancArray);
      }
      
    }

    function findDistance(){
      calculateDistance=true;
    }

    function disableDistance(){
      calculateDistance=false;
      if(distancArray.length>1){
        b=distancArray.pop()
        map.removeLayer(b);
        //distancArray=[]; 
      }
    }

    function enableTrackCreate(){
      createTrack=true;
    }

    function disableTrackCreate(){
      createTrack=false;
    }

    function clearCreatedTrack(){
      console.log(distancelines.length)
      for(i=0;i<distancelines.length;){
        x=distancelines.pop();
        map.removeLayer(x);
      }
      removeCurrMarker();
      createdTrackdistance=0;
      length=document.getElementById('distanceTrack');
      length.innerHTML='';
      a=document.getElementById('fname');
      a.value='';
      disableTrackCreate();
      createdTrack=[];
    }

    function saveTrack(){
      console.log(createdTrack);
      //formGML(createdTrack);
      var name=document.getElementById('fname').value;
      sendData(createdTrack,name);
    }

    function sendData(lineArray,name){
      line=formLineString(lineArray);
      //line=line.substring(0, line.length - 1);
      var postData =
      '<wfs:Transaction\n'
      + '  service="WFS"\n'
      + '  version="1.1.0"\n'
      + 'xmlns:gis_test ="http://localhost:8080/geoserver/gis_test"\n'
      + `  xmlns:wfs="http://www.opengis.net/wfs"\n`
      + `  xmlns:gml="http://www.opengis.net/gml"\n`
      + `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`
      + `   xsi:schemaLocation="http://www.opengis.net/wfs http://localhost:8080/geoserver/schemas/wfs/1.1.0/wfs.xsd\n`
      + `                      http://localhost:8080/geoserver/gis_test/wfs/DescribeFeatureType?typename=gis_test:created_tracks">\n`
      + '  <wfs:Insert>\n'
      + '   <gis_test:created_tracks>\n'
      + `   <gis_test:name>${name}</gis_test:name>\n`
      + '   <gis_test:geom>\n'
      + '       <gml:LineString  srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">\n'
      + '            <gml:coordinates xmlns:gml="http://www.opengis.net/gml" decimal="." cs="," ts=" ">' + line + '</gml:coordinates>\n'
      + '        </gml:LineString >\n'
      + '   </gis_test:geom>\n'
      + '  </gis_test:created_tracks>\n'
      + '  </wfs:Insert>\n'
      + '</wfs:Transaction>';

      var wfsUrl = `${serverBaseUrl}/wfs`;
      console.log(postData);
      $.ajax({
        type: "POST",
        url: wfsUrl,
        dataType: "xml",
        contentType: "text/xml",
        data: postData,
        //TODO: Error handling
        success: function (xml) {
          console.log(xml);
        }
      });
    }


    function formLineString(dataArray){
      var string=''
      dataArray.forEach(point=>{
        string+=point.lng+','+point.lat+' ';
      })
      //console.log(string);
      return string
    }

    function distanceBetweenTrackPoints(pointA,pointB){
      drawLine(pointA,pointB);
      x=getDistanceFromLatLonInKm(pointA.lat,pointA.lng,pointB.lat,pointB.lng);
      x=Math.round(x*100)/100;
      //var dist = document.getElementById('distanceTrack');
      //dist.innerHTML=x+"km";
      //console.log(x);
      return x;
    }

    function distanceBetweenPoints(){
      if(calculateDistance){
        var point1=distancArray[0].latlng;
        var point2=distancArray[1].latlng;
        drawLine(point1,point2);
        x=getDistanceFromLatLonInKm(point1.lat,point1.lng,point2.lat,point2.lng);
        x=Math.round(x*100)/100;
        var dist = document.getElementById('distance');
        dist.innerHTML=x+"km";
      }
      
    }

    function drawLine(point1,point2){
      var pointlist=[point1,point2];
      //pointlist.forEach(swap);
      var line = new L.polyline(pointlist, {
        color: 'red',
        weight: 3,
        opacity: 0.5
    });
    //map.fitBounds(line.getBounds());
    line.addTo(map);
    distancelines.push(line);
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
        Rute: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.datapoint,
          format: 'image/png',
          transparent: true
        }),
		    Trekovi: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.tracks,
          format: 'image/png',
          transparent: true
        }),
        KreiraniTrekovi: L.tileLayer.wms(serverBaseUrl + '/wms', {
          layers: layer.created_tracks,
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

    function createAlpineHutLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.polygon4326}&outputformat=json&cql_filter=tourism='alpine_hut'&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var uni = data.features.map(feature =>
              L.marker([feature.geometry.coordinates[0][0][1], feature.geometry.coordinates[0][0][0]]).bindPopup('Naziv: '+feature.properties.name+'\n'+"\nKontakt: "+feature.properties.operator).openPopup()
            );
            hut = L.layerGroup(uni);
            resolve();
          }
        }, 'hut')
      });
    } 

    function createNationalParkLayer() {
      return new Promise((resolve, reject) => {
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.polygon4326}&outputformat=json&cql_filter=boundary in ('national_park', 'protected_area')&CRS=EPSG:4326`;
        var tmp=null;
        $.ajax({
          'async': false,
          'url': url,
          'dataType': "json",
          'type': "GET",
           success: function (data) {
              tmp=data;
              var layer=tmp.features.forEach(element => {
                element.geometry.coordinates.forEach(cord=>{
                  cord.forEach(swap);
                   layer = new L.polyline(cord, {
                    color: 'green',
                    weight: 2,
                    opacity: 0.3
                });
                layer.addTo(map);
                });
              });
           }
        });
      });
    }

    function createPeakLayer() {
      return new Promise((resolve, reject) => {
        let peakUrl = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=natural='peak'%20AND%20WITHIN(way,collectGeometries(queryCollection('gis_test:planet_osm_polygon_new','way','boundary=''national_park''')))&CRS=EPSG:4326`;
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
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.tracks}&outputformat=json&CRS=EPSG:4326`;
        callApiAndSetLayer(url, null, function (data) {
          if (data && data.features) {
            var uni = data.features.map(feature =>
              markTrek([feature.geometry.coordinates[0][0][1], feature.geometry.coordinates[0][0][0]], feature.properties.name)
              
            );
            start = L.layerGroup(uni);
            resolve();
          }
        }, 'start')
      });
    }
    
    
    function createPathLayer(e){
      for(var i=0;i<markers.length;i++){
        if(markers[i][0]._latlng==e.latlng){
          var msg=markers[i][1];
          drawPath(msg)
        }
      } 
    }

    function drawPath(msg){
      if(polylines.length!=0){
        x=polylines.pop();
        map.removeLayer(x);
      }
      return new Promise((resolve, reject) => {
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
        src=tmp.features[0].properties.src;
        n=tmp.features[0].properties.name;
        pointList=tmp.features[0].geometry.coordinates[0];
        pointList.forEach(swap);
        var firstpolyline = new L.polyline(pointList, {
            color: 'blue',
            weight: 4,
            opacity: 0.4
        });
        //map.fitBounds(firstpolyline.getBounds());
        firstpolyline.addTo(map);
        polylines.push(firstpolyline);
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
        formGraphData(tmp);
      });
    }

    function formGraphData(data){
    var xValues=[];
    var yValues=[];
    count=0;
    count2=0;
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
    drawGraph(xValues,yValues);
    }

    function drawGraph(xV,yV){
      var xValues =xV;
      var yValues = yV;
      if(myChr!=null){
        myChr.destroy();
      }
      
      myChr=new Chart("myChart", {
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
            if(posOnGraphMarker!=null){
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
        let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.point4326}&outputformat=json&cql_filter=amenity='drinking_water' OR waterway='source' OR natural='spring'&CRS=EPSG:4326`;
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
         callApiAndSetLayer(url, null, function (data, latlng, tt) {
           if (data && data.features) {
             var uni = data.features.map(feature =>              
               markFeature([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], feature.properties.name, tt)           
             );
             var flag = false;
             filtered_peaks = L.layerGroup(uni);
             if(flag == true){
               map.eachLayer((layer) => {
                 if(layer['_latlng']!=undefined)
                 layer.remove();
               })
               filtered_peaks.addTo(map);
             }
             layerControls.addOverlay(filtered_peaks, 'Odabrani vrhovi');
             resolve(filtered_peaks);
           }
         }, 'filtered_peaks')
       });
     }

    function filterTreksRegion(){
      let value;
      if(document.getElementById('myRadio1').checked){
        value=document.getElementById('myRadio1').value;
      }else if(document.getElementById('myRadio2').checked){
        value=document.getElementById('myRadio2').value;
      }else if(document.getElementById('myRadio3').checked){
        value=document.getElementById('myRadio3').value;
      }else if(document.getElementById('myRadio4').checked){
        value=document.getElementById('myRadio4').value;
      }else if(document.getElementById('myRadio5').checked){
        value=document.getElementById('myRadio5').value;
      }else if(document.getElementById('myRadio6').checked){
        value=document.getElementById('myRadio6').value;
      }else if(document.getElementById('myRadio7').checked){
        value=document.getElementById('myRadio7').value;
      }else if(document.getElementById('myRadio8').checked){
        value=document.getElementById('myRadio8').value;
      }
      let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.trek_start}&outputformat=json&cql_filter=WITHIN(geom,collectGeometries(queryCollection('gis_test:planet_osm_polygon_new','way','name=''${value}''')))&CRS=EPSG:4326`;
      filterRegion(url);
    }

    function filterRegion(url){
      return new Promise((resolve, reject) => {
        callApiAndSetLayer(url, null, function (data, latlng, tt) {
          if (data && data.features) {
            var uni = data.features.map(feature =>              
              markTrek([feature.geometry.coordinates[1], feature.geometry.coordinates[0]],feature.properties.name)          
            );
            var flag = false;
            filtered_treks = L.layerGroup(uni);
            if(flag == true){
              map.eachLayer((layer) => {
                if(layer['_latlng']!=undefined)
                layer.remove();
              })
              filtered_treks.addTo(map);
            }
            layerControls.addOverlay(filtered_treks, 'Odabrani trekovi');
            resolve(filtered_treks);
          }
        }, 'filtered_treks')
      });
    }

    function clearTrekRegion(){
      map.removeLayer(filtered_treks)
      layerControls.removeLayer(filtered_treks);
      layerControls._update();
    }

    function filterTrekDate(){
      var startDate = document.getElementById('startDatum').value;
      var endDate = document.getElementById('krajDatum').value;
      var startTime = "00:00";
      var endTime = "00:00";
      const startDateTime = new Date(startDate + ' ' + startTime);
      const endDateTime = new Date(endDate + ' ' + endTime);

      var sDT = startDateTime.toISOString();
      var eDT = endDateTime.toISOString();
      let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.trek_start}&outputformat=json&cql_filter=dtime%20AFTER%20${sDT}%20and%20dtime%20BEFORE%20${eDT}&CRS=EPSG:4326`;
      createfilterDateLayer(url);
    }

    function createfilterDateLayer(url){
      return new Promise((resolve, reject) => {
        callApiAndSetLayer(url, null, function (data, latlng, tt) {
          if (data && data.features) {
            var uni = data.features.map(feature =>              
              markTrek([feature.geometry.coordinates[1], feature.geometry.coordinates[0]],feature.properties.name)          
            );
            var flag = false;
            filtered_treks_date = L.layerGroup(uni);
            if(flag == true){
              map.eachLayer((layer) => {
                if(layer['_latlng']!=undefined)
                layer.remove();
              })
              filtered_treks_date.addTo(map);
            }
            layerControls.addOverlay(filtered_treks_date, 'Odabrani trekovi');
            resolve(filtered_treks_date);
          }
        }, 'filtered_treks_date')
      });
    }

    function clearTrekDate(){
      map.removeLayer(filtered_treks_date)
      layerControls.removeLayer(filtered_treks_date);
      layerControls._update();
    }

    
     function createTracksNationalParks() {
        return new Promise((resolve, reject) => { 
          let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.trek_start}&outputformat=json&cql_filter=WITHIN(geom,collectGeometries(queryCollection('gis_test:planet_osm_polygon_new','way','boundary=''national_park''')))&CRS=EPSG:4326`;//boundary in ('national_park', 'protected_area')
          callApiAndSetLayer(url, null, function (data) {
            if (data && data.features) {
              var w = data.features.map(feature =>
                markTrek([feature.geometry.coordinates[1], feature.geometry.coordinates[0]],feature.properties.name)
              );
              voda = L.layerGroup(w);
              resolve();
            }
          }, 'voda')});
      }

      function createWaterSourcesNearTracks() {
        return new Promise((resolve, reject) => {
          let url = `${serverBaseUrl}/wfs?service=wfs&version=1.1.0&request=GetFeature&typename=${layer.tracks}&outputformat=json&cql_filter=DWITHIN(wkb_geometry,collectGeometries(queryCollection('gis_test:planet_osm_point_new','way','amenity=''drinking_water''')),10,meters)&CRS=EPSG:4326`;//amenity='drinking_water'%20OR%20waterway='source'%20OR%20natural='spring'%20AND%20
          callApiAndSetLayer(url, null, function (data) {
            if (data && data.features) {
              var w = data.features.map(feature =>
                markTrek([feature.geometry.coordinates[0][0][1], feature.geometry.coordinates[0][0][0]],feature.properties.name)
              );
              voda2 = L.layerGroup(w);
              resolve();
            }
          }, 'voda2')});
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
      }else if (type == 'peak'){
        ico = icons.peak;  
      }else if (type == 'start'){
        ico = icons.start;  
      }else if (type == 'waterfall'){
        ico = icons.waterfall;  
      }else if (type == 'drinking_water'){
        ico = icons.spring;  
      }else if (type == 'viewpoint'){
        ico = icons.viewpoint;  
      }else if (type == 'filtered_treks'){
        ico = icons.start;  
      }else if(type=='filtered_treks_date'){
        ico = icons.start;
      }else if (type == 'park'){
        ico = icons.cave;  
      }else if (type == 'voda2'){
        ico = icons.start;  
      }else if (type == 'hut'){
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