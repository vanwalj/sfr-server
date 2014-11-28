/**
 * Created by Jordan on 26/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    aws         = require('aws-sdk'),
    parameters  = require('../parameters'),
    models      = require('../models');

module.exports = function (app) {
    var router = express.Router();

    router.route('/').post([
        passport.authenticate('teacher-bearer', {session: false}),

    ]);

    router.route('/')
        .delete([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var courseId = req.body.courseId;

                if (!courseId) return res.shortResponses.badRequest({clientError: 'courseId not specified'});
                models.Course.remove({ id: courseId, teacher: req.user.id }, function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
                });
            }
        ])
        .post([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var courseName = req.body.name;
                var courseLogin = req.body.login;
                var coursePassword = req.body.password;

                if (!courseName || !courseLogin || !coursePassword)
                    return res.shortResponses.badRequest({clientError: 'name, login or password not specified'});
                var course = new models.Course({
                    login: courseLogin,
                    name: courseName,
                    password: coursePassword,
                    teacher: req.user.id
                });
                course.save(function (err, course) {
                    if (err) return next(err);
                    return res.shortResponses.created({courseId: course.id});
                });
            }
    ]);

    router.route('/mkdir')
        .put([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var path = req.body.path;
                var courseId = req.body.courseId;

                if (!path || !courseId)
                    return res.shortResponses.badRequest({clientError: 'path or courseId not specified.'});
                models.Course.find({ teacher: req.user.id, id: courseId }, function (err, course) {
                    if (err) return next(err);
                    if (!course) return res.shortResponses.notFound();
                    course.mkdir(path);
                    return res.shortResponses.created();
                });
            }
    ]);

    router.route('/file')
        .post([

        ]);

    router.route('/file/bucket')
        .post([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var s3 = new AWS.S3({computeChecksums: true});
                var params = {
                    Bucket: parameters.aws.s3Bucket,
                    Key: 'fileName'
                }
            }
        ]);

    app.use('/course', router);
};