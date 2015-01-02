/**
 * Created by Jordan on 02/01/15.
 */

var hat      = require('hat');

module.exports = function (mongoose) {
    var schoolTokenSchema = mongoose.Schema({
        value: { type: String, required: true, default: hat() },
        school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }
    });

    return mongoose.model('SchoolToken', schoolTokenSchema);
};