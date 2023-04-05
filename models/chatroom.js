const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema({
    name: {
        type: String
    }
})

const Chatroom = mongoose.model('Chatroom', chatroomSchema);

module.exports = Chatroom;