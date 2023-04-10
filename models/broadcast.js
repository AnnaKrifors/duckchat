const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
   
    username: {
        type: String
    },
    message: {
        type: String
    }
})

const Broadcast = mongoose.model('Broadcast', broadcastSchema);

module.exports = Broadcast;