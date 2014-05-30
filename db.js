var mongoose = require('mongoose')
var Schema = mongoose.Schema
    ,ObjectId = Schema.ObjectId;

var db_url = process.env.MONGOHQ_URL || "mongodb://localhost:27017/gitpapers", 
    db = mongoose.connect(db_url);

var userSchema = new Schema({
    id: ObjectId,
    username: String,
    avatar_url: String
});

var user = db.model('user', userSchema);
