
/*
 * GET home page.
 */
var request = require('request');
var markdown = require('markdown').markdown;
var mongoose = require('mongoose');
var db = require('../db')
var user = mongoose.model('user');

function form2Json(str)
{
    "use strict";
    var obj,i,pt,keys,j,ev;
    if (typeof form2Json.br !== 'function')
    {
        form2Json.br = function(repl)
        {
            if (repl.indexOf(']') !== -1)
            {
                return repl.replace(/\](.+?)(,|$)/g,function($1,$2,$3)
                {
                    return form2Json.br($2+'}'+$3);
                });
            }
            return repl;
        };
    }
    str = '{"'+(str.indexOf('%') !== -1 ? decodeURI(str) : str)+'"}';
    obj = str.replace(/\=/g,'":"').replace(/&/g,'","').replace(/\[/g,'":{"');
    obj = JSON.parse(obj.replace(/\](.+?)(,|$)/g,function($1,$2,$3){ return form2Json.br($2+'}'+$3);}));
    pt = ('&'+str).replace(/(\[|\]|\=)/g,'"$1"').replace(/\]"+/g,']').replace(/&([^\[\=]+?)(\[|\=)/g,'"&["$1]$2');
    pt = (pt + '"').replace(/^"&/,'').split('&');
    for (i=0;i<pt.length;i++)
    {
        ev = obj;
        keys = pt[i].match(/(?!:(\["))([^"]+?)(?=("\]))/g);
        for (j=0;j<keys.length;j++)
        {
            if (!ev.hasOwnProperty(keys[j]))
            {
                if (keys.length > (j + 1))
                {
                    ev[keys[j]] = {};
                }
                else
                {
                    ev[keys[j]] = pt[i].split('=')[1].replace(/"/g,'');
                    break;
                }
            }
            ev = ev[keys[j]];
        }
    }
    return obj;
}

exports.index = function(req, res){
  if (req.query.code) {
    req.session.code = req.query.code;

    request.post("https://github.com/login/oauth/access_token"
      , {form: {client_id: GITHUB_ID, client_secret: GITHUB_SECRET, code: req.session.code, redirect_uri: "http://gitpapers.herokuapp.com/callback" }}
      , function (error, response, body) {
        if(response.statusCode == 201 || response.statusCode == 200){
          console.log("Success");
          data = form2Json(body);
          req.session.access_token = data["access_token"];
          console.log(data["access_token"]+"=access_token");
          request.get({url: "https://api.github.com/user", qs: {access_token: req.session.access_token}, headers: {"User-Agent": "node.js"}}, function(err, response2, body2) {
            req.session.userData = JSON.parse(body2)["login"];
            user.findOne({username: req.session.userData}, function(err, userMatch) {
              if (!userMatch) {
                var newUser = new user({ 
                  username: req.session.userData,
                  avatar_url: JSON.parse(body2)["avatar_url"]
                });
                newUser.save();

              } 
              loggedIn = true
              res.redirect("http://gitpapers.com/"+JSON.parse(body2)["login"]);
            })
            
          })

         
        } else {
          console.log('error: '+ response.statusCode);
          res.render('index', { title: 'GitPapers' , client_id: '8831b0a4ca9f60a96c55'});
        }
      }
   )
  } else {
    
        res.render('index', { title: 'GitPapers' , client_id: '8831b0a4ca9f60a96c55'});
      
    
  } 

  

};

exports.callback = function(req, res) {
  res.send(req.session.access_token);
}

exports.userPosts = function(req, res) {
  if (req.params.username == "logout") {
    console.log("logging out")
    if(req.session.access_token){
      delete req.session.access_token;
      delete loggedIn;
    }
    res.redirect('/')
  } 

  if (req.session.access_token) {
    loggedIn = true;
  } else {
    loggedIn = false;
  }

  console.log(loggedIn)
  var username = req.params.username
  var works = true;

  request.get({url: "https://api.github.com/users/"+username, headers: {"User-Agent": "node.js"}}, function(err, response, body1) {
    data1 = JSON.parse(body1);
    userInfo = {username: username, avatar_url: data1["avatar_url"], name: data1["name"], location: data1["location"]}
    request.get({url: "https://api.github.com/repos/"+username+"/gitpapers-blog/contents", headers: {"User-Agent": "node.js"}}, function(err, response, body2) {
      data = JSON.parse(body2);
      var posts = []

      for (i=0; i<data.length; i++) {
        title = data[i].name.replace(/\.[^/.]+$/, "")
        title = title.replace(/_/g, ' ');
        posts.push(title);
      }

      console.log("posts--"+posts);
      if( works == true ) {

        if (loggedIn) {
          res.render("UserPosts", {title: "GitPapers", username: username, userInfo: userInfo, posts: posts, loggedIn: true});
        } else {
          res.render("UserPosts", {title: "GitPapers", username: username, userInfo: userInfo, posts: posts, loggedIn: false});
        }
        
        works = false;
      }
      
    });
  })


}

exports.post = function(req, res) {
  if (req.session.access_token) {
    loggedIn = true;
  } else {
    loggedIn = false;
  }

  console.log(req.params.post)

  var _username = req.params.username
  console.log("params user"+ _username);
    var works = true;

    request.get({url: "https://api.github.com/users/"+_username, headers: {"User-Agent": "node.js"}}, function(err, response, body1) {
      data1 = JSON.parse(body1);
      console.log("data1: "+body1)
      userInfo = {username: _username, avatar_url: data1["avatar_url"], name: data1["name"], location: data1["location"]}
        
        var title = req.params.post.replace(/-/g, '_')
      
      console.log("https://api.github.com/users/"+_username)
      if( works == true ) {
        request.get({url: "https://api.github.com/repos/"+_username+"/gitpapers-blog/contents/"+title+".md", headers: {"User-Agent": "node.js"}}, function(err, response, body){
          if (typeof JSON.parse(body)["content"] != "undefined") {
            var buf = new Buffer(JSON.parse(body)["content"], 'base64').toString(); 
            console.log(buf)

            content = markdown.toHTML( buf ) 
            if (loggedIn) {
              res.render("post", {title: "GitPapers", username: _username, userInfo: userInfo, postTitle: title.replace(/_/g, ' '), content: content, loggedIn: true});
            } else {
              res.render("post", {title: "GitPapers", username: _username, userInfo: userInfo, postTitle: title.replace(/_/g, ' '), content: content, loggedIn: false});
            }
          } else {
            if (loggedIn) {
              res.render("post", {title: "GitPapers", username: _username, userInfo: userInfo, postTitle: title.replace(/_/g, ' '), content: content, loggedIn: true});
            } else {
              res.render("post", {title: "GitPapers", username: _username, userInfo: userInfo, postTitle: title.replace(/_/g, ' '), content: content, loggedIn: false});
            }
          }
          
          
          
          works = false;
        });
        
      }
        
    })
}

