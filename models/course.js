/**
 * Created by Jordan on 26/11/14.
 */

var models      = require('./index'),
    bcrypt      = require('bcryptjs'),
    winston     = require('winston'),
    parameters  = require('../parameters');

module.exports = function (mongoose) {
    var courseSchema = mongoose.Schema({
        login: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: { type: String, required: true },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
        registeredDevices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }]
    });

    courseSchema.pre('save', function(next) {
        var course = this;
        if (!course.isModified('password')) return next();
        bcrypt.genSalt(10, function(err, salt) {
            if (err) return next(err);
            bcrypt.hash(course.password, salt, function(err, hash) {
                if (err) return next(err);
                course.password = hash;
                next();
            });
        });
    });

    courseSchema.post('remove', function (course) {

        models.File.remove({
            course: course._id
        }, function (err) {
            if (err) return winston.error('Error removing files.', err);
        });
    });

    courseSchema.methods = {
        validPassword: function (password, cb) {
            bcrypt.compare(password, this.password, function (err, res) {
                cb(err, res);
            });
        },
        generateToken: function (cb) {
            models.CourseToken.generateTokenForCourse(this, cb);
        }
    };

    return mongoose.model('Course', courseSchema);
};