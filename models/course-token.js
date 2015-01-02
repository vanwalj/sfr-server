/**
 * Created by Jordan on 26/11/14.
 */

var hat = require('hat');

module.exports = function (mongoose) {

    var courseToken = mongoose.Schema({
        value: {type: String, required: true, default: hat() },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }
    });

    return mongoose.model('CourseToken', courseToken);

};
