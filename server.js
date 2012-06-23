require('nodetime').profile({
    stdout : false
});
//@formatter:off
var flatiron = require('flatiron'), app = flatiron.app, path = require('path'), ecstatic = require('ecstatic'), json = require('JSON');
//@formatter:on

var webroot = path.join(__dirname, 'public');

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

// Check for production (nodejitsu) or development (localhost) and deploy on
// appropriate port
if(process.env.NODEJS_ENV == "production") {
    app.start(8080);
    // the server will listen on port 80
} else {
    app.start(8080);
    // the server will listen on port 8080
}