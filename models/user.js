import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 32,
        trim: true
    },
    lastName: {
        type: String,
        maxlength: 32,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,

    },
    phone: {
        type: String,
        maxlength: 15,
        trim: true,
        unique: true
    },
    designation: {
        type: String,
        maxlength: 30,
        trim: true
    },
    collegeName: {
        type: String,
        maxlength: 200,
        trim: true
    },
    regNo: {
        /// Only for sliet students just to keep record
        type: String,
        maxlength: 10,
        trim: true
    },
    collegeAddress: {
        type: String,
        maxlength: 200,
        trim: true
    },
    courseEnrolled: {
        // BSC, BTech etc
        type: String,
        maxlength: 100,
        trim: true
    },
    branchOfStudy: {
        type: String,
        maxlength: 100,
        trim: true
    },
    studyYear: {
        type: Number,
    },
    encryPassword: {
        type: String,
        required: true
    },
    salt: String,
    //0 for normal user ,1 for admin
    role: {
        type: Number,
        default: 0
    },
    verificationCode: {
        type: String,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isProfileComplete: {
        type: Boolean,
        default: 0
    }

});

userSchema.virtual("password").set(function (password) {
    this._password = password;
    this.salt = uuidv4();
    this.encryPassword = this.securePassword(password);
}).get(
    function () {
        return this._password;
    }
)

userSchema.methods = {
    authenticate: function (plainPassword) {
        return this.securePassword(plainPassword) === this.encryPassword;
    },

    securePassword: function (plainPassword) {
        if (!plainPassword) {
            return "";
        }

        try {
            return createHmac("sha256", this.salt)
                .update(plainPassword)
                .digest("hex");
        } catch (err) {
            return console.log(err);
        }
    }
}

export default mongoose.model('User', userSchema)