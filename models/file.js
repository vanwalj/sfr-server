/**
 * Created by Jordan on 28/11/14.
 */

var AWS         = require('aws-sdk'),
    winston     = require('winston'),
    notifications = require('../utils/notifications'),
    parameters  = require('../parameters');

module.exports = function (mongoose) {
    var fileSchema = mongoose.Schema({
        teacher: {type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true},
        course: {type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true},
        fileName: {type: String, required: true},
        type: {type: String, required: true},
        published: { type: Boolean, required: true, default: false },
        comment: { type: String },
        contentLength: { type: Number, required: true},
        path: {type: String, required: true},
        valid: {type: Boolean, default: false, required: true},
        createdAt: { type: Date, default: Date.now, required: true },
        publishedAt: { type: Date }
    });

    fileSchema.pre('save', function(next) {
        var file = this;
        if (file.isModified('published')) {
            if (file.published == true) {
                file.publishedAt = Date.now;
                notifications.filePublished(file);
            } else {
                file.publishedAt = undefined;
            }
        }
        next();
    });

    fileSchema.post('remove', function (file) {
        var S3 = new AWS.S3();

        S3.deleteObject({
            Bucket: parameters.aws.s3Bucket,
            Key: file._id
        }, function (err, data) {
            if (err) return winston.error('Error deleting the file from S3', err);
            winston.log('info', 'File successfully deleted', file);
        });
    });

    return mongoose.model('File', fileSchema);
};