// requires node's http module
var http = require('http');

// creates a new httpServer instance
var server = http.createServer(function(req, res) {
	// this is the callback, or request handler for the httpServer

	// respond to the browser, write some headers so the
	// browser knows what type of content we are sending
	res.writeHead(200, {
		'Content-Type' : 'text/html'
	});

	// write some content to the browser that your user will see
	res.write('<h1>hello, i know nodejitsu.</h1>');

	// close the response
	res.end();
});

//Check for production (nodejitsu) or development (localhost) and deploy on appropriate port
if(process.env.NODEJS_ENV == "production"){
	server.listen(80); // the server will listen on port 80
}else{
	server.listen(8080); // the server will listen on port 80
}

