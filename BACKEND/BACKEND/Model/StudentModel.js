const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const studentSchema = new Schema({
    name: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^[A-Z]/.test(v);
            },
            message: props => `${props.value} is not a valid Name! Must start with a capital letter.`
        }
    },
    std_index: {
        type: String,
        required: true,
        unique: true,   // each student has unique index no
        validate: {
            validator: function (v) {
                return /^S\d{4}$/.test(v);
            },
            message: props => `${props.value} is not a valid Student Index! Must be 'S' followed by 4 digits (e.g. S1234).`
        }
    },
    section: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d+[A-Z]$/.test(v);
            },
            message: props => `${props.value} is not a valid Class Section! Must be a number followed by an uppercase letter (e.g. 1A).`
        }
    },
    parentName: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^[A-Z]/.test(v);
            },
            message: props => `${props.value} is not a valid Parent Name! Must start with a capital letter.`
        }
    },
    parentPhoneNum: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\+94\d{9}$/.test(v);
            },
            message: props => `${props.value} is not a valid Phone Number! Must start with +94 followed by 9 digits.`
        }
    },
    email: {
        type: String,
        required: true,
        // unique: true, 
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid Email Address!`
        }
    },
    password: {
        type: String,
        required: true
    },
    profilePic: {
        type: String, // stores the path to the file
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model("StudentModel", studentSchema);