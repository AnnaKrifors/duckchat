const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema({
    name: {
        type: String
    },
    posts: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
      }
   
})

const Chatroom = mongoose.model('Chatroom', chatroomSchema);

module.exports = Chatroom;