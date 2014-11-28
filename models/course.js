/**
 * Created by Jordan on 26/11/14.
 */

var models = require('./index');

module.exports = function (mongoose) {
    var courseSchema = mongoose.Schema({
        login: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: { type: String, required: true },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
        content: [ mongoose.Schema.Types.Mixed ]
    });

    courseSchema.pre('save', function(next) {
        var course = this;
        if (!course.isModified('password')) return next();
        bcrypt.genSalt(10, function(err, salt) {
            if (err) return next(err);
            bcrypt.hash(course.password, salt, function(err, hash) {
                if (err) return next(err);
                course.password = hash;
                next();
            });
        });
    });

    courseSchema.methods = {
        validPassword: function (password, cb) {
            bcrypt.compare(password, this.password, function (err, res) {
                cb(err, res);
            });
        },
        generateToken: function (cb) {
            models.CourseToken.generateTokenForCourse(this, cb);
        },
        mkdir: function (path, cb) {
            var directories = path.split('/');
            var node = this.content;
            directories.forEach(function (directory) {
                if (directory && directory.length) {
                    if (node[directory] == undefined) node[directory] = [];
                    node = node[directory];
                }
            });
        }
    };

    return mongoose.model('Course', courseSchema);
};