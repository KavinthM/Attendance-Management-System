const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
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
    teacherId: {
        type: String,
        required: true,
        unique: true,
    },
    subject: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d+[A-Z]$/.test(v);
            },
            message: props => `${props.value} is not a valid Class Section! Must be a number followed by an uppercase letter (e.g. 1A).`
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(v);
            },
            message: props => `${props.value} is not a valid Gmail Address! Must end with @gmail.com.`
        }
    },
    phone: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\+94\s?\d{9}$/.test(v);
            },
            message: props => `${props.value} is not a valid Phone Number! Must start with +94 followed by 9 digits.`
        }
    },
    password: {
        type: String,
        required: true,
    },
    profilePic: {
        type: String, // Path to the uploaded file
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Teacher", teacherSchema);
