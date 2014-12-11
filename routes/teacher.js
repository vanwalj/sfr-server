/**
 * Created by Jordan on 21/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    AWS         = require('aws-sdk'),
    winston     = require('winston'),
    bodyParser  = require('body-parser'),
    parameters  = require('../parameters'),
    models      = require('../models');

module.exports = function (app) {
    var router = express.Router();

    router.route('/token').get([
        passport.authenticate('teacher-basic', {session: false}),
        function (req, res, next) {
            req.user.generateToken(function (err, teacherToken) {
                if (err) return next(err);
                if (!teacherToken) return next(new Error('Unable to generate a teacher token.'));
                winston.log('info', 'New teacher token !', { user: req.user.toJSON(), token: teacherToken.toJSON() });
                return res.shortResponses.ok({ Bearer: teacherToken.value });
            });
        }
    ]);

    router.route('/register').post([
        bodyParser.json(),
        function (req, res, next) {
            if (!req.body.login || !req.body.password) {
                winston.log('info', 'Register attempt without enough info.', req.body);
                return res.shortResponses.badRequest({ clientError: "Missing login or password." });
            }
            new models.Teacher({login: req.body.login, password: req.body.password})
                .save(function (err, teacher) {
                    if (err && err.code == 11000) return res.shortResponses.conflict({ clientError: 'Login already exist.' });
                    if (err) return next(err);
                    if (!teacher) return next(new Error('Unable to register a new teacher.'));
                    winston.log('info', 'New teacher !', teacher.toJSON());
                    return res.shortResponses.ok();
                });
        }
    ]);

    router.param('courseId', function (req, res, next, courseId) {
        models.Course.findOne({ _id: courseId }, function (err, course) {
            if (err) return next(err);
            if (!course) return res.shortResponses.notFound({clientError: 'course not found'});
            req.course = course;
            next();
        });
    });

    router.param('fileId', function (req, res, next, fileId) {
        models.File.findOne({ _id: fileId }, function (err, file) {
            if (err) return next(err);
            if (!file) return res.shortResponses.notFound({clientError: 'file not found'});
            req.file = file;
            next();
        });
    });

    router.route('/course/:courseId')
        .delete([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var course = req.course;

                if (req.user.id != course.teacher) return res.shortResponses.forbidden();
                course.remove(function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
                });
            }
        ])
        .put([
            bodyParser.json(),
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var course = req.course;

                if (req.user.id != course.teacher) return res.shortResponses.forbidden();

                course.login = req.body.login || course.login;
                course.name = req.body.name || course.name;
                if (req.body.password) course.password = req.body.password;
                course.save(function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
                });


            }
        ]);

    router.route('/course')
        .post([
            bodyParser.json(),
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

    router.route('/course/:courseId/mkdir')
        .put([
            bodyParser.json(),
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var path = req.body.path;
                var course = req.course;

                if (!path) return res.shortResponses.badRequest({clientError: 'path not specified.'});
                if (course.teacher != req.user.id) return res.shortResponses.forbidden();
                course.mkdir(path);
                course.save(function (err) {
                    if (err) return next(err);
                    return res.shortResponses.created();
                })
            }
        ]);

    router.route('/course/:courseId/file/:fileId')
        .delete([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var course = req.course;
                var file = req.file;

                if (req.user.id != file.teacher != course.teacher) return res.shortResponses.forbidden();
                course.rmFile(file);
                course.save(function (err) {
                    if (err) return next(err);
                    file.remove(function (err) {
                        if (err) return next(err);
                        return res.shortResponses.ok();
                    });
                });
            }
        ])
        .get([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var s3 = new AWS.S3();
                var params = { Bucket: parameters.aws.s3Bucket, Key: req.file.id };
                s3.getSignedUrl('getObject', params, function (err, url) {
                    if (err) return next(err);
                    res.shortResponses.ok({url: url});
                });
            }
        ]);

    router.route('/course/:courseId/file')
        .post([
            bodyParser.json(),
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var fileName = req.body.fileName;
                var path = req.body.path;
                var course = req.course;
                var contentType = req.body.contentType;
                var contentLength = req.body.contentLength;
                //TODO check content type

                if (!fileName || !path || !contentType || !contentLength)
                    res.shortResponses.badRequest({
                        clientError: 'fileName path contentType or contentLength not specified.'
                    });
                if (req.user.id != course.teacher) return res.shortResponses.forbidden();
                var file = new models.File({
                    teacher: req.user.id, course: course.id, fileName: fileName, type: contentType
                });
                file.save(function (err) {
                    if (err) return next(err);
                    var s3 = new AWS.S3();
                    var params = {
                        Bucket: parameters.aws.s3Bucket,
                        Key: file.id,
                        ContentType: contentType,
//                        ContentLength: 99999,
                        Expires: 60
                    };
                    s3.getSignedUrl('putObject', params, function (err, url) {
                        if (err) return next(err);
                        course.putFile(path, file);
                        console.log(course);
                        course.save(function (err) {
                            if (err) return next(err);
                            res.shortResponses.created({url: url});
                        });
                    });
                });


            }
        ]);

    router.route('/course/file/validate')
        .put([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var file = req.file;
                var course = req.course;

                if (file.teacher != course.teacher != req.user.id) return res.shortResponses.forbidden();
                file.valid = true;
                file.save(function (err) {
                    if (err) return next(err);
                    res.shortResponses.ok();
                });
            }
        ]);

    app.use('/teacher', router);
};