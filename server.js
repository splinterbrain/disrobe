require('nodetime').profile({stdout:false});
var skeleton = require('skeleton');


// creates a new httpServer instance
var server = skeleton.createServer();

//Check for production (nodejitsu) or development (localhost) and deploy on appropriate port
if(process.env.NODEJS_ENV == "production"){
	server.listen(80); // the server will listen on port 80
}else{
	server.listen(8080); // the server will listen on port 80
}

