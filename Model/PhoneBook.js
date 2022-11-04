const mongoose = require('mongoose');
//phone book
const schema = mongoose.Schema({
    Name:{
        type:String,
        required: true
    },
   Tel:{
    type: Number,
    required: true
   },
   img:{
    type: String
   },
   created_at: {type : Date, default: new Date()},
   created_by:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
   }
})


module.exports =  mongoose.model('PhoneBook', schema)