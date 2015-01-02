/**
 * Created by Jordan on 02/01/15.
 */

var models      = require('./index'),
    winston     = require('winston'),
    bcrypt      = require('bcryptjs'),
    massAssign  = require('mongoose-mass-assign'),
    parameters  = require('../parameters');

module.exports = function (mongoose) {
    var schoolSchema = mongoose.Schema({
        login: { type: String },
        password: { type: String }
    });

    schoolSchema.plugin(massAssign);

    schoolSchema.methods = {
        validPassword: function (password, cb) {
            bcrypt.compare(password, this.password, function (err, res) {
                cb(err, res);
            });
        }
    };


    schoolSchema.post('remove', function (school) {
        models.Teacher.remove({ school: school._id }, function (err) {
            if (err) winston.error(err);
        });
    });

    schoolSchema.set('toJSON', {
        transform: function (doc, ret, options) {
            delete ret.password;
            return ret;
        }
    });

    return mongoose.model('School', schoolSchema);
};