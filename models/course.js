/**
 * Created by Jordan on 26/11/14.
 */

var models      = require('./index'),
    winston     = require('winston'),
    parameters  = require('../parameters');

module.exports = function (mongoose) {
    var courseSchema = mongoose.Schema({
        code: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
        registeredDevices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }]
    });

    courseSchema.post('remove', function (course) {

        models.File.remove({
            course: course._id
        }, function (err) {
            if (err) return winston.error('Error removing files.', err);
        });
    });

    courseSchema.methods = {
        generateToken: function (cb) {
            models.CourseToken.generateTokenForCourse(this, cb);
        }
    };

    return mongoose.model('Course', courseSchema);
};