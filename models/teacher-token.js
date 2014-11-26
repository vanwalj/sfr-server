/**
 * Created by Jordan on 21/11/14.
 */

var hat = require('hat');

module.exports = function (mongoose) {

    var teacherTokenSchema = mongoose.Schema({
        value: {type: String, required: true },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }
    });

    teacherTokenSchema.statics.generateTokenForTeacher = function(teacher, cb) {
        var TeacherToken = this;

        var teacherToken = new TeacherToken({ teacher: teacher.id, value: hat() });
        teacherToken.save(cb);
    };

    return mongoose.model('TeacherToken', teacherTokenSchema);
};