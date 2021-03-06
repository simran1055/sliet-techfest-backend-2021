const mongoose = require('mongoose');

const coordinatorSchema = new mongoose.Schema({

    coordinatorName: {
        type: String,
        required: true,
        maxlength: 32,
        trim: true
    },
    coordinatorPhone: {
        type: String,
        required: true,
        maxlength: 15,
        trim: true
    },
    coordinatorEmail: {
        type: String,
        required: true,
        trim: true,

    },
    coordinatorType: {
        //faculty or student
        type: String,
    },
    coordinatorDesignation: {
        type: String,
        trim: true,
    },
    photo: {
        // data: Buffer,
        // contentType: String
        type: String,

        trim: true,
    }
})


module.exports = mongoose.model("Coordinator", coordinatorSchema)
