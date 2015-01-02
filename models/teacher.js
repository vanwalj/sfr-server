/**
 * Created by Jordan on 21/11/14.
 */

var bcrypt      = require('bcryptjs'),
    hat         = require('hat'),
    massAssign  = require('mongoose-mass-assign'),
    parameters  = require('../parameters'),
    models      = require('./index');

module.exports = function (mongoose) {
    var teacherSchema = mongoose.Schema({
        login: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: {
            first: { type: String },
            last: { type: String, required: true },
            title: { type: String }
        },
        picture: { type: String },
        resetToken: { type: String, protect: true },
        school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, protect: true }
    });

    teacherSchema.virtual('fullName').get(function () {
        var fullName = "";
        if (this.name.title) fullName += this.name.title + " ";
        if (this.name.first) fullName += this.name.first + " ";
        if (this.name.last) fullName += this.name.last;
        if (fullName.length > 0 && fullName[fullName.length - 1] == " ") fullName = fullName.substring(0, fullName.length - 1);
        return fullName;
    });

    teacherSchema.virtual('resetUrl').get(function () {
        return parameters.lostPassword.resetUrl + this.resetToken;
    });

    teacherSchema.pre('save', function(next) {
        var teacher = this;
        if (!teacher.isModified('password')) return next();
        bcrypt.genSalt(10, function(err, salt) {
            if (err) return next(err);
            bcrypt.hash(teacher.password, salt, function(err, hash) {
                if (err) return next(err);
                teacher.password = hash;
                next();
            });
        });
    });

    teacherSchema.post('remove', function (teacher) {
        models.Course.remove({
            teacher: teacher._id
        }, function (err) {
            if (err) return winston.error('Error removing courses', err);
        });
    });

    teacherSchema.methods = {
        validPassword: function (password, cb) {
            bcrypt.compare(password, this.password, function (err, res) {
                cb(err, res);
            });
        },
        generateResetToken: function () {
            this.resetToken = hat();
        }
    };

    teacherSchema.set('toJSON', {
        transform: function (doc, ret, options) {
            delete ret.password;
            delete ret.resetToken;
            return ret;
        }
    });

    teacherSchema.plugin(massAssign);

    return mongoose.model('Teacher', teacherSchema);
};