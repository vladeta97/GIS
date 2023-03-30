import os, subprocess, glob
from osgeo import ogr
from flask import Flask, request, render_template, jsonify
from flask_cors import CORS
import gpxpy
import gpxpy.gpx
import shapely
from shapely import Point
import psycopg2

app=Flask(__name__)
CORS(app)

inFormat = "gpx"

gpxImportLayers = ["waypoints", "routes", "route_points", "tracks", "track_points"]

dbFormat = "PostgreSQL"
dbHost = "localhost"
dbName = "postgis"
dbSchema = "public"
dbUser = "postgres"
dbPWD = "admin"


def createPostgisConnection(dbFormat, dbHost, dbName, dbSchema, dbUser, dbPWD):
    pg = ogr.GetDriverByName(dbFormat)
    if pg is None:
        raise RuntimeError('{0} driver not available'.format(dbFormat))
    conn = pg.Open("PG:dbname='{0}' user='{1}' password='{2}'".format(dbName, dbUser, dbPWD), True)
    if conn is None:
        raise RuntimeError('Cannot open dataset connection')
    return conn

def importGPX(gpxFile, gpxLayerFilter, pgConn):
    """Import features from a GPX file into PostGIS"""

    def ogrCreateLayer(sourceLayer, pgConn, destinationLayer):
        print ("  Creating {0}".format(destinationLayer))
        newLayer = pgConn.CreateLayer(destinationLayer)

        lyrDefn = sourceLayer.GetLayerDefn()
        for i in range( lyrDefn.GetFieldCount() ):
            print ("Creating field: {0}".format(lyrDefn.GetFieldDefn( i ).GetName()))

            fieldName = lyrDefn.GetFieldDefn( i ).GetName()
            fieldType = lyrDefn.GetFieldDefn( i ).GetType()
            newField = ogr.FieldDefn(fieldName, fieldType)
            newLayer.CreateField(newField)

    def ogrAppendFeatures(gpxFile, sourceLayer, destinationLayer):
        print ("  Importing {0}:  {1} features".format(sourceLayer.GetName(), sourceLayer.GetFeatureCount()))
        fName = os.path.basename(gpxFile)
        destinationLayer.StartTransaction()
        for x in range(sourceLayer.GetFeatureCount()):
            sourceFeature = sourceLayer.GetNextFeature()
            sourceFeature.SetFID(-1)
            sourceFeature.SetField("src", fName)
            destinationLayer.CreateFeature(sourceFeature)
        destinationLayer.CommitTransaction()

    print ("Reading {0}".format(gpxFile))
    try:
        datasource = ogr.Open(gpxFile)
        if datasource == None:
            print ("  WARNING: Could not read {0}.  Skipping...".format(gpxFile))
            return None

        for i in range(datasource.GetLayerCount()):
            print (datasource.GetLayer(i).GetName())

            if datasource.GetLayer(i).GetName() not in gpxLayerFilter:
                print ("  Skipping {0}:  User filtered".format(datasource.GetLayer(i).GetName()))
            elif datasource.GetLayer(i).GetFeatureCount() == 0:
                print ("  Skipping {0}:  0 features".format(datasource.GetLayer(i).GetName()))
            else:
                inLayer = datasource.GetLayer(i)
                outLayer = "{0}.{1}".format(dbSchema, inLayer.GetName())

                if pgConn.GetLayerByName(outLayer) == None:
                    ogrCreateLayer(inLayer, pgConn, outLayer)

                ogrAppendFeatures(gpxFile, inLayer,pgConn.GetLayerByName(outLayer))

        del datasource


    except Exception as e:
        print (e.args)

def addFirstPointToDB(gpxfile):
    conn = psycopg2.connect(database=dbName,host=dbHost,user=dbUser,password=dbPWD)
    cur=conn.cursor()
    cur.execute("SELECT EXISTS(SELECT * FROM information_schema.tables WHERE table_name='start_point')")
    table_exists = cur.fetchone()[0]
    if not table_exists:
        cur.execute("""CREATE TABLE start_point (id SERIAL PRIMARY KEY,name TEXT,src TEXT,lon NUMERIC,lat NUMERIC,elevation NUMERIC)""")
        cur.execute("ALTER TABLE start_point ADD COLUMN geom geometry(Point, 4326);")
    conn.commit()
    print(gpxfile)
    gpx_file=open(gpxfile,encoding="utf8")
    gpx=gpxpy.parse(gpx_file)
    print(gpx)
    track=gpx.tracks[0]
    point=track.segments[0].points[0]
    print(gpx.time)
    #point=gpx.tracks[0].segments[0].points[0]
    cur.execute("INSERT INTO start_point (name, src, lon,lat,elevation,dtime) VALUES (%s, %s, %s,%s,%s,%s)", (track.name,gpxfile,point.longitude, point.latitude, point.elevation,gpx.time))
    conn.commit()
    cur.execute("UPDATE start_point SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)")
    conn.commit()
    cur.close()
    conn.close()
    
    #for track in gpx.tracks:
        #for segment in track.segments:
          #  for point in segment.points:
           #     print("Point at ({0},{1}) -> {2}".format(point.latitude, point.longitude, point.elevation))
            #    x=abs(x-point.elevation)


@app.route('/', methods= ['GET', 'POST'])
def get_message():
 # if request.method == "GET":
 print("Got request in main function")
#return render_template("index.html")

@app.route('/upload_file', methods=['POST'])
def upload_file():
 print("Got request in static files")
 print(request.files)
 f = request.files['static_file']
 f.save(f.filename)

 pgConn = createPostgisConnection(dbFormat, dbHost, dbName, dbSchema, dbUser, dbPWD)
 importGPX(f.filename, gpxImportLayers, pgConn)
 pgConn=None

 addFirstPointToDB(f.filename)
 resp = {"success": True, "response": "file saved!"}
 return jsonify(resp), 200


if __name__ == '__main__':
   app.run(host='0.0.0.0',debug=True)
