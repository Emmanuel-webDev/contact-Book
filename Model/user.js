const mongoose = require('mongoose');

//User Schema
const userSchema = mongoose.Schema({
    Username:String,
    Email:String,
    password: String
})

const user = mongoose.model("user", userSchema)

module.exports = user
