//require('nodetime').profile({
//    stdout : false
//});

//For reasons passing understanding, the formatter toggle isn't working, thus the crazy long line of requires
//@formatter:off
var flatiron = require('flatiron'), app = flatiron.app, path = require('path'), json = require('JSON'), mongodb = require('mongodb'), connect = require('connect');
//@formatter:on

var webroot = path.join(__dirname, 'public');
var HTTP_PORT, DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME;

app.use(flatiron.plugins.log, {});

//Set connection variables for production or development environments
//Probably want to move these to nsconf or such eventually
if (process.env.NODEJS_ENV == "production") {
    HTTP_PORT = 8080;
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
    auto_reconnect:true
}, {}));
db.open(function (openError, openData) {
    if (openData) {
        if (DB_USER && DB_PASS) {
            //Not sure if this authentication sticks in an auto_reconnect
            openData.authenticate(DB_USER, DB_PASS, function (authError, authData) {
                if (authError) {
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
    db.collection('test_collection', function (err, collection) {
        collection.insert({
            timestamp:new mongodb.Timestamp()
        }, function (err, docs) {
            collection.count(function (err, count) {
                app.log.info("Test docs count", count);
            });
            collection.find().sort({
                timestamp:-1
            }).limit(1).nextObject(function (err, doc) {
                    app.log.info("Most recent test doc", doc);
                });
        });
    });
}

//Evetually we'll want to use templates to generate static versions of html files
//For now we just serve the mockups

app.use(flatiron.plugins.http, {
    before:[
        // Try serving it as a static file
        //If such a file exists, route matching will be skipped
        connect.compress(),
        connect.favicon(),
        connect.static(webroot)]

});

//We name space API so we can have html files of similar name later
//It doesn't appear that director allows for route matching based on
//Accept header, so json/html server at same endpoint would have to
//occur inside the function
app.router.path("/api/garments/:id", function () {
    this.get(function (id) {
        //Store these for use in db callbacks
        var res = this.res;
        var req = this.req;

        //Mongos double nested callback structure is a bit cumbersome
        //Might want to look into resourceful or mongoose
        //May also be able to store a reference to the collection
        db.collection('garments', function (err, collection) {
            if (err) {
                //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                app.log.error("Error retrieving collection", err);
                res.writeHead(500);
                res.end(err);
            } else {
                var _id;
                try {
                    _id = mongodb.ObjectID.createFromHexString(id);
                } catch (e) {
                    app.log.error("Error creating id", e);
                    res.writeHead(500);
                    res.end();
                    return;
                }

                collection.findOne({
                    _id:_id
                }, {
                    image:0
                }, function (err, doc) {
                    if (err) {
                        app.log.error("Error retrieving record", err);
                        res.writeHead(500);
                        res.end(err);
                    } else {
                        res.writeHead(200, {
                            'Content-Type':'application/json'
                        });
                        res.write(json.stringify(doc));
                        res.end();

                    }
                });
            }
        });
    });
    //Making a fairly duplicative put to complement the post below
    //Probably want to unify these into a single upsert call while maintaining the endpoints
    this.put(function (id) {
        //Store these for use in db callbacks
        var res = this.res;
        var req = this.req;

        //Just copy and pasted this whole nested flow, never a good sign, efficiency-wise
        db.collection('garments', function (err, collection) {
            if (err) {
                //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                app.log.error("Error retrieving collection", err);
                res.writeHead(500);
                res.end(err);
            } else {
                var update = {};
                //Need some validation here eventually
                //Theoretically req.body is ready and parsed when the function gets called
                if (req.body.item)
                    update.item = req.body.item;
                if (req.body.color)
                    update.color = req.body.color;
                if (req.body.style)
                    update.style = req.body.style;
                //We update the image as base64, which is a bit ugly, but mongo binary is being uncooperative
                //Also have to keep in mind the 4MB size limit
                //Might eventually move to GridFS
                if (req.body.image)
                    update.image = req.body.image;

                var _id;
                try {
                    _id = mongodb.ObjectID.createFromHexString(id);
                } catch (e) {
                    app.log.error("Error creating id", e);
                    res.writeHead(500);
                    res.end();
                    return;
                }

                collection.update({
                    _id:_id
                }, update, {
                    safe:true
                }, function (err, doc) {
                    if (err) {
                        app.log.error("Error retrieving record", err);
                        res.writeHead(500);
                        res.end(err);
                    } else {
                        if (doc) {
                            //We only get a count of updates back
                            app.log.info("updated doc", doc);
                            res.writeHead(200, {
                                'Content-Type':'application/json'
                            });
                            res.end();
                            analyzeGarments();
                        } else {
                            //Update didn't find a matching id
                            app.log.error("Failed to update record ", id);
                            res.writeHead(404);
                            res.end();
                        }
                    }
                });
            }
        });
    }),
        //Access the image
        this.get("/image", function (id) {
            //Store these for use in db callbacks
            var res = this.res;
            var req = this.req;

            //Mongos double nested callback structure is a bit cumbersome
            //Might want to look into resourceful or mongoose
            //May also be able to store a reference to the collection
            db.collection('garments', function (err, collection) {
                if (err) {
                    //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                    app.log.error("Error retrieving collection", err);
                    res.writeHead(500);
                    res.end(err);
                } else {
                    var _id;
                    try {
                        _id = mongodb.ObjectID.createFromHexString(id);
                    } catch (e) {
                        app.log.error("Error creating id", e);
                        res.writeHead(500);
                        res.end();
                        return;
                    }

                    collection.findOne({
                        _id:_id
                    }, function (err, doc) {
                        if (err) {
                            app.log.error("Error retrieving record", err);
                            res.writeHead(500);
                            res.end(err);
                        } else {
                            //Need to write some headers here to allow for caching
                            res.writeHead(200, {
                                "Content-Type":"image/jpeg"
                            });
                            //Right now we just write an empty response if there's no image
                            //Might want to make it a 404 or such
                            if (doc.image)
                                res.write(new Buffer(doc.image, "base64"));
                            res.end();

                        }
                    });
                }
            });
        });
});

app.router.path("/api/garments", function () {

    //Eventually need to have some filters on this
    //Probably default to only the current session's user's garments
    this.get(function () {
        //Store these for use in db callbacks
        var res = this.res;
        var req = this.req;

        db.collection('garments', function (err, collection) {
            if (err) {
                //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                app.log.error("Error retrieving collection", err);
                res.writeHead(500);
                res.end(err);
            } else {
                collection.find({}).toArray(function (err, docs) {
                    if (err) {
                        app.log.error("Error retrieving index");
                        res.writeHead(500);
                        res.end(err);
                    } else {
                        res.writeHead(200, {
                            "Content-Type":"application/json"
                        });
                        res.write(json.stringify(docs));
                        res.end();
                    }
                });
            }
        });
    });

    this.post(function () {
        //Store these for use in db callbacks
        var res = this.res;
        var req = this.req;

        //Just copy and pasted this whole nested flow, never a good sign, efficiency-wise
        db.collection('garments', function (err, collection) {
            if (err) {
                //Should have a shared 500 error system, maybe with a try/catch, though difficult to attach to the router
                app.log.error("Error retrieving collection", err);
                res.writeHead(500);
                res.end(err);
            } else {
                var insert = {};
                //Need some validation here eventually
                //Theoretically req.body is ready and parsed when the function gets called
                // app.log.info("body", req.body);
                insert.item = req.body.item;
                insert.color = req.body.color;
                insert.style = req.body.style;
                //We save the image as base64, which is a bit ugly, but mongo binary is being uncooperative
                //Also have to keep in mind the 4MB size limit
                //Might eventually move to GridFS
                insert.image = req.body.image;
                collection.insert(insert, function (err, docs) {
                    if (err) {
                        app.log.error("Error retrieving record", err);
                        res.writeHead(500);
                        res.end(err);
                    } else {
                        res.writeHead(201, {
                            'Content-Type':'application/json'
                        });
                        res.write(json.stringify(docs[0]));
                        res.end();

                        analyzeGarments();

                    }
                });
            }
        });
    });
});

app.router.configure({
    notfound:function () {
        this.res.writeHead(404);
        this.res.end("404 Not Found");
    }
});

app.start(HTTP_PORT);

//We use socket.io to broadcast alerts to the client
socketio = require('socket.io').listen(app.server);
//Start socketio listener
socketio.sockets.on("connection", function (socket) {
    socket.emit("info", {
        connection:"established"
    });
});
//This is mostly a dummy of an async task that could take a long time
function analyzeGarments() {
    db.collection('garments', function (err, collection) {
        if (err) {
            app.log.error("Error retrieving collection", err);
        } else {
            collection.count({
                color:"black"
            }, function (err, count) {
                if (err) {
                    app.log.error("Error counting black outfits");
                } else {
                    if (count > 3) {
                        socketio.sockets.emit("alert", "You have a lot of black garments. Maybe try some color.");
                    }
                }
            });
        }
    });
}