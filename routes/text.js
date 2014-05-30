request = require("request")

request.get({url: "https://api.github.com/repos/jawerty/gitpapers/contents/README.md", headers: {"User-Agent": "node.js"}}, function(err, res, body){
	var buf = new Buffer(JSON.parse(body)["content"], 'base64').toString(); // Ta-da
	console.log(buf)
});