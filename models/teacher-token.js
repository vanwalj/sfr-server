/**
 * Created by Jordan on 21/11/14.
 */

var hat = require('hat');

module.exports = function (mongoose) {

    var teacherTokenSchema = mongoose.Schema({
        value: {type: String, required: true, default: hat() },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }
    });

    return mongoose.model('TeacherToken', teacherTokenSchema);
};