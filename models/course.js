/**
 * Created by Jordan on 26/11/14.
 */

var models = require('./index'),
    bcrypt = require('bcryptjs');

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
        mkdir: function (path) {
            var directories = path.split('/');
            var node = this.content;
            directories.forEach(function (directory) {
                if (directory && directory.length) {
                    if (node[directory] == undefined) node[directory] = [];
                    node = node[directory];
                }
            });
        },
        putFile: function (path, file, mkdir) {
            if (mkdir) {
                this.mkdir(path);
            }
            var directories = path.split('/');
            var node = this.content;
            directories.forEach(function (directory) {
                if (directory && directory.length) {
                    if (!node[directory]) node[directory] = [];
                    node = node[directory];
                }
            });
            if (!node['files']) node['files'] = [];
            node['files'].push(file.id);
        },
        rmFile: function (file) {
            var directories = file.path.split('/');
            var node = this.content;
            directories.forEach(function (directory) {
                if (directory && directory.length) {
                    if (!node[directory]) node[directory] = [];
                    node = node[directory];
                }
            });
            var index = node['files'].indexOf(file.id);
            if (index >= 0) delete node['files'][index];
        }
    };

    return mongoose.model('Course', courseSchema);
};