/**
 * Created by Jordan on 21/11/14.
 */

var bcrypt = require('bcryptjs'),
    hat    = require('hat'),
    models = require('./index');

module.exports = function (mongoose) {
    var teacherSchema = mongoose.Schema({
        login: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        firstName: { type: String },
        lastName: { type: String },
        title: { type: String },
        picture: { type: Buffer },
        resetToken: { type: String }
    });

    teacherSchema.virtual('fullName').get(function () {
        return this.title + " " + this.firstName + " " + this.lastName;
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
        generateToken: function (cb) {
            models.TeacherToken.generateTokenForTeacher(this, cb);
        },
        generateResetToken: function () {
            this.resetToken = hat();
        }
    };

    return mongoose.model('Teacher', teacherSchema);
};