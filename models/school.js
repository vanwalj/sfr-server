/**
 * Created by Jordan on 02/01/15.
 */

var models      = require('./index'),
    winston     = require('winston'),
    bcrypt      = require('bcryptjs'),
    massAssign  = require('mongoose-mass-assign');

module.exports = function (mongoose) {
    var schoolSchema = mongoose.Schema({
        login: { type: String, unique: true, required: true },
        password: { type: String, required: true }
    });


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

    schoolSchema.plugin(massAssign);

    return mongoose.model('School', schoolSchema);
};