/**
 * Created by Jordan on 26/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    parameters  = require('../parameters'),
    models      = require('../models');

module.exports = function (app) {
    var router = express.Router();



    router.route('/token')
        .get([
            passport.authenticate('course-basic', {session: false}),
            function (req, res, next) {
                req.user.generateToken(function (err, courseToken) {
                    if (err) return next(err);
                    if (!courseToken) return next(new Error('Unable to generate a course token.'));
                    winston.log('info', 'New course token !', { user: req.user.toJSON(), token: courseToken.toJSON() });
                    return res.shortResponses.ok({ Bearer: courseToken.value });
                });
            }
        ]);

    router.route('/')
        .get([
            passport.authenticate('course-bearer', {session : false}),
            function (req, res, next) {
                res.shortResponses.ok({
                    name: req.user.name,
                    content: req.user.content
                });
            }
        ]);

    router.param('fileId', function (req, res, next, fileId) {
        models.File.findOne({ _id: fileId }, function (err, file) {
            if (err) return next(err);
            if (!file) return res.shortResponses.notFound({clientError: 'file not found'});
            req.file = file;
            next();
        });
    });

    router.route('/:fileId')
        .get([
            passport.authenticate('course-bearer', {session : false}),
            function (req, res, next) {
                if (req.file.course != req.user.id) return next (err);
                var s3 = new AWS.S3();
                var params = { Bucket: parameters.aws.s3Bucket, Key: req.file.id };
                s3.getSignedUrl('getObject', params, function (err, url) {
                    if (err) return next(err);
                    res.shortResponses.ok({url: url});
                });
            }
        ]);

    app.use('/course', router);
};