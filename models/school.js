/**
 * Created by Jordan on 02/01/15.
 */

var models      = require('./index'),
    winston     = require('winston'),
    bcrypt      = require('bcryptjs'),
    massAssign  = require('mongoose-mass-assign');

module.exports = function (mongoose) {
    var schoolSchema = mongoose.Schema({
        login: { type: String },
        password: { type: String }
    });




    return mongoose.model('School', schoolSchema);
};