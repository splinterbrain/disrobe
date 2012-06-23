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
    DB_USER = arr[0];
    DB_PASS = arr[1];
    DB_HOST = arr[2];
    DB_PORT = arr[3];
    DB_NAME = arr[4];
}else{
    HTTP_PORT = 8080;
    DB_HOST = "localhost";
    DB_PORT = 27017; //Default mongod port
    DB_NAME = "disrobe";
}

//Connect to mongod
//Thanks again to ibid for help connecting when using native mongod
app.log.info("Connecting to mongodb", [DB_HOST, DB_PORT]);
var db = new mongodb.Db(DB_NAME, new mongodb.Server(DB_HOST, DB_PORT, {auto_reconnect: true}, {}));
db.open(function(openError, openData){
    if(openData){
        if(DB_USER && DB_PASS){
            openData.authenticate(DB_USER, DB_PASS, function(authError, authData){
               if(authError) app.log.error(authError); 
            });    
        }else{
            app.log.info
        }        
    }else{
        app.log.error(openError);
    }
});

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
app.router.path("/api/garment/:id", function() {
    this.get(function(id) {
        this.res.writeHead(200, {'Content-Type' : 'application/json'} );
        this.res.write(json.stringify({name : "foo"}));
        this.res.end();
    });

    this.post(function(id){
        
    });

});

app.router.configure({
    notfound : function() {
        this.res.writeHead(404);
        this.res.end("404 Not Found");
    }
});



app.start(HTTP_PORT);
