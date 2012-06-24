require('nodetime').profile({
    stdout : false
});

//For reasons passing understanding, the formatter toggle isn't working, thus the crazy long line of requires
//@formatter:off
var flatiron = require('flatiron'), app = flatiron.app, path = require('path'), ecstatic = require('ecstatic'), json = require('JSON'), mongodb = require('mongodb');
//@formatter:on

var webroot = path.join(__dirname, 'public');
var HTTP_PORT, DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME;

app.use(flatiron.plugins.log, {});

//Set connection variables for production or development environments
//Probably want to move these to nsconf or such eventually
if(process.env.NODEJS_ENV == "production") {
    HTTP_PORT = 80;
    var njMongo = "mongodb://nodejitsu:b291c5811deafe3ed85f6b32c140a2df@staff.mongohq.com:10039/nodejitsudb951252111336";
    //Thanks to http://joesul.li/van/blog/nodejitsu-node-mongo-native.html for parsing regex
    var arr = /.*:\/\/(.*):(.*)@(.*):(.*)\/(.*)/.exec(njMongo);
    //exec puts the full matched string into arr[0]
    DB_USER = arr[1];
    DB_PASS = arr[2];
    DB_HOST = arr[3];
    DB_PORT = arr[4];
    DB_NAME = arr[5];
    app.log.info("Parsed mongo info", arr);
} else {
    HTTP_PORT = 8080;
    DB_HOST = "localhost";
    DB_PORT = "27017";
    //Default mongod port
    DB_NAME = "disrobe";
}

//Connect to mongod
//Thanks again to ibid for help connecting when using native mongod
app.log.info("Connecting to mongodb", [DB_HOST, DB_PORT]);
//mongodb.Server apparently requirest a port of type number
var db = new mongodb.Db(DB_NAME, new mongodb.Server(DB_HOST, parseInt(DB_PORT), {
    auto_reconnect : true
}, {}));
db.open(function(openError, openData) {
    if(openData) {
        if(DB_USER && DB_PASS) {
            //Not sure if this authentication sticks in an auto_reconnect
            openData.authenticate(DB_USER, DB_PASS, function(authError, authData) {
                if(authError) {
                    app.log.error(authError);
                } else {
                    app.log.info("Authenticated to mongo successfuly");
                    mongoTest();
                }
            });
        } else {
            app.log.info("Connected to mongo successfully");
            mongoTest();
        }
    } else {
        app.log.error(openError);
    }
});
//In addition to a test insertion we may want to use this point to ensure indices
function mongoTest() {
    db.collection('test_collection', function(err, collection) {
        collection.insert({
            timestamp : new mongodb.Timestamp()
        }, function(err, docs) {
            collection.count(function(err, count) {
                app.log.info("Test docs count", count);
            });
            collection.find().sort({
                timestamp : -1
            }).limit(1).nextObject(function(err, doc) {
                app.log.info("Most recent test doc", doc);
            });
        });
    });
}

//Evetually we'll want to use templates to generate static versions of html files
//For now we just serve the mockups

app.use(flatiron.plugins.http, {
    before : [
    // If no route matches, try serving it as a static file
    ecstatic(webroot)]

});

//We name space API so we can have html files of similar name later
//It doesn't appear that director allows for route matching based on
//Accept header, so json/html server at same endpoint would have to
//occur inside the function
app.router.path("/api/garments/:id", function() {
    this.get(function(id) {
        //Store these for use in db callbacks
        var res = this.res;
        var req = this.req;

        //Mongos double nested callback structure is a bit cumbersome
        //Might want to look into resourceful or mongoose
        //May also be able to store a reference to the collection
        db.collection('garments', function(err, collection) {
            if(err) {
                //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                app.log.error("Error retrieving collection", err);
                res.writeHead(500);
                res.end(err);
            } else {
                var _id;
                try {
                    _id = mongodb.ObjectID.createFromHexString(id);
                } catch(e) {
                    app.log.error("Error creating id", e);
                    res.writeHead(500);
                    res.end();
                    return;
                }

                collection.findOne({
                    _id : _id
                }, function(err, doc) {
                    if(err) {
                        app.log.error("Error retrieving record", err);
                        res.writeHead(500);
                        res.end(err);
                    } else {
                        res.writeHead(200, {
                            'Content-Type' : 'application/json'
                        });
                        res.write(json.stringify(doc));
                        res.end();

                    }
                });
            }
        });
    });
    //Eventually need an update here

    //Access the image
    this.get("/image", function(id) {
        //Store these for use in db callbacks
        var res = this.res;
        var req = this.req;

        //Mongos double nested callback structure is a bit cumbersome
        //Might want to look into resourceful or mongoose
        //May also be able to store a reference to the collection
        db.collection('garments', function(err, collection) {
            if(err) {
                //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                app.log.error("Error retrieving collection", err);
                res.writeHead(500);
                res.end(err);
            } else {
                var _id;
                try {
                    _id = mongodb.ObjectID.createFromHexString(id);
                } catch(e) {
                    app.log.error("Error creating id", e);
                    res.writeHead(500);
                    res.end();
                    return;
                }

                collection.findOne({
                    _id : _id
                }, function(err, doc) {
                    if(err) {
                        app.log.error("Error retrieving record", err);
                        res.writeHead(500);
                        res.end(err);
                    } else {                        
                        res.writeHead(200, {"Content-Type" : "image/jpeg"});                        
                        res.write(new Buffer(doc.image, "base64"));
                        res.end();

                    }
                });
            }
        });
    });
});

app.router.path("/api/garments", function() {

    //May want an index here eventually

    this.post(function() {
        //Store these for use in db callbacks
        var res = this.res;
        var req = this.req;

        //Just copy and pasted this whole nested flow, never a good sign, efficiency-wise
        db.collection('garments', function(err, collection) {
            if(err) {
                //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                app.log.error("Error retrieving collection", err);
                res.writeHead(500);
                res.end(err);
            } else {
                var insert = {};
                //Need some validation here eventually
                if(req.headers["content-type"] == "application/json") {
                    insert.item = req.body.item;
                    insert.color = req.body.color;
                    insert.style = req.body.style;
                    //Decode the base64 string and save is as binary
                    insert.image = req.body.image;
                } else {
                    //Chunks are all downloaded before routes are called
                    //This might cause memory problems with very large uploads
                    insert.image = mongodb.Binary(req.chunks.join());
                }
                //Theoretically req.body is ready and parsed when the function gets called
                collection.insert(insert, function(err, docs) {
                    if(err) {
                        app.log.error("Error retrieving record", err);
                        res.writeHead(500);
                        res.end(err);
                    } else {
                        res.writeHead(201, {
                            'Content-Type' : 'application/json'
                        });
                        res.write(json.stringify(docs[0]));
                        res.end();
                    }
                });
            }
        });
    });
});

app.router.configure({
    notfound : function() {
        this.res.writeHead(404);
        this.res.end("404 Not Found");
    }
});

app.start(HTTP_PORT);
