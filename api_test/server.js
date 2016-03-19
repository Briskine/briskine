var http = require("http");
var fs = require('fs');
var server = http.createServer(function(request, response) {
  fs.readFile('./api_test.html', function(error, content) {
		if (error) {
			response.writeHead(500);
			response.end();
		}
		else {
			response.writeHead(200, { 'Content-Type': 'text/html' });
			response.end(content, 'utf-8');
		}
	});
});
server.listen(3800);
console.log("Server is listening");
