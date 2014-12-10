/**
 * Created by Jordan on 26/11/14.
 */

var hat = require('hat');

module.exports = function (mongoose) {

    var courseToken = mongoose.Schema({
        value: {type: String, required: true },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }
    });

    courseToken.statics.generateTokenForCourse = function(course, cb) {
        var CourseToken = this;

        var courseToken = new CourseToken({ course: course.id, value: hat() });
        courseToken.save(cb);
    };

    return mongoose.model('CourseToken', courseToken);

};
