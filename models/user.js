/**
 * Created by Jordan on 21/11/14.
 */

var bcrypt = require('bcryptjs');

module.exports = function (mongoose) {
    var userSchema = mongoose.Schema({
        login: { type: String, required: true },
        password: { type: String, required: true }
    });

    userSchema.pre('save', function(next) {
        var user = this;
        if (!user.isModified('password')) return next();
        bcrypt.genSalt(10, function(err, salt) {
            if (err) return next(err);
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
            });
        });
    });

    userSchema.methods = {
        validPassword: function (password, cb) {
            bcrypt.compare(password, this.password, function (err, res) {
                cb(err, res);
            });
        }
    };

    return mongoose.model('User', userSchema);
};