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


    router.route('/')
    /**
     * @api {post} /teacher Post a new teacher account
     * @apiVersion 0.1.0
     * @apiName PostTeacher
     * @apiGroup Teacher
     * @apiDescription Register a new teacher
     *
     * @apiParam {String} login New teacher login
     * @apiParam {String} password New teacher password
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *
     */
        .post([
        bodyParser.json(),
        function (req, res, next) {
            if (!req.body.login || !req.body.password) {
                winston.log('info', 'Register attempt without enough info.', req.body);
                return res.shortResponses.badRequest({ clientError: "Missing login or password." });
            }
            new models.Teacher({
                login: req.body.login,
                password: req.body.password
            }).save(function (err, teacher) {
                    if (err && err.code == 11000) return res.shortResponses.conflict({ clientError: 'Login already exist.' });
                    if (err) return next(err);
                    if (!teacher) return next(new Error('Unable to register a new teacher.'));
                    winston.log('info', 'New teacher !', teacher.toJSON());
                    return res.shortResponses.ok();
                });
        }
    ])
    /**
     * @api {delete} /teacher Delete a teacher account
     * @apiVersion 0.1.0
     * @apiName DeleteTeacher
     * @apiGroup Teacher
     * @apiDescription Delete the current teacher account and all related courses/files
     *
     * @apiHeader {String} Authorization basic access authentication (see: http://en.wikipedia.org/wiki/Basic_access_authentication#Client_side)
     * @apiHeaderExample {json} Header-Example:
     *      {
     *        "Authorization": "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=="
     *      }
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *
     */
        .delete([
            passport.authenticate('teacher-basic', {session: false}),
            function (req, res, next) {
                req.user.remove(function (err, teacher) {
                    if (err) return next(err);
                    winston.log('info', 'Teacher account deleted', teacher);
                    res.shortResponses.ok();
                });
            }
        ]);

    router.route('/token')
    /**
     * @api {get} /teacher/token Get a teacher bearer token
     * @apiVersion 0.1.0
     * @apiName GetTeacherToken
     * @apiGroup Teacher
     * @apiDescription Get a bearer token for subsequent request
     *
     * @apiHeader {String} Authorization basic access authentication (see: http://en.wikipedia.org/wiki/Basic_access_authentication#Client_side)
     * @apiHeaderExample {json} Header-Example:
     *      {
     *        "Authorization": "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=="
     *      }
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *      {
     *        "Bearer": "e3d9682632881ff0a555c7a9fedda415"
     *      }
     *
     */
        .get([
        passport.authenticate('teacher-basic', {session: false}),
        function (req, res, next) {
            req.user.generateToken(function (err, teacherToken) {
                if (err) return next(err);
                if (!teacherToken) return next(new Error('Unable to generate a teacher token.'));
                winston.log('info', 'New teacher token !', { user: req.user.toJSON(), token: teacherToken.toJSON() });
                return res.shortResponses.ok({ Bearer: teacherToken.value });
            });
        }
    ])
    /**
     * @api {delete} /teacher/token Delete a teacher bearer token
     * @apiVersion 0.1.0
     * @apiName DeleteTeacherToken
     * @apiGroup Teacher
     * @apiDescription Delete a bearer token
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *
     */
        .delete([
            passport.authenticate('teacher-basic', {session: false}),
            function (req, res, next) {
                var tokenValue = req.header('Authorization').substr("Bearer ".length);
                models.TeacherToken.remove({
                    value: tokenValue
                }, function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
                });
            }
        ]);

    router.route('/course')
    /**
     * @api {post} /teacher/course Post a new course
     * @apiVersion 0.1.0
     * @apiName PostCourse
     * @apiGroup Teacher
     * @apiDescription Post a new course and set name and student login/password to access to this course
     *
     * @apiParam {String} login New course login
     * @apiParam {String} password New course password
     * @apiParam {String} name New course name
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *      {
     *          "courseId": "dwadwa5464856w4ada"
     *      }
     *
     */
        .post([
            passport.authenticate('teacher-bearer', {session: false}),
            bodyParser.json(),
            function (req, res, next) {
                if (!req.body.name || !req.body.login || !req.body.password)
                    return res.shortResponses.badRequest({clientError: 'name, login or password not specified'});

                new models.Course({
                    login: req.body.login,
                    name: req.body.name,
                    password: req.body.password,
                    teacher: req.user._id
                }).save(function (err, course) {
                    if (err && err.code == 11000) return res.shortResponses.conflict();
                    if (err) return next(err);
                    return res.shortResponses.created({courseId: course.id});
                });
            }
        ])
    /**
     * @api {get} /teacher/course Get the course list
     * @apiVersion 0.1.0
     * @apiName GetCourseList
     * @apiGroup Course
     * @apiDescription Get the course list
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *        "content": [
     *          { id: '5fi4m456445adwwd', name: 'Bio PG' },
     *          { id: 'dahjkdwa45456665', name: 'Bio UG1' }
     *          { id: '98dihuwa56645654', name: 'Maths' }
     *        ]
     *      }
     *
     */
        .get([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                models.course.find({
                    teacher: req.user.id
                }, function (err, courses) {
                    if (err) return next(err);
                    var content = [];
                    courses.forEach(function (course) {
                        content.push({
                            id: course._id,
                            name: course.name
                        });
                    });
                    res.shortResponses.ok({ content: content });
                });
            }
        ]);

    router.route('/course/:courseId')
        .get([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                if (req.user.id != req.course.teacher) return res.shortResponses.forbidden();
                next();
            },
            function (req, res, next) {
                models.File.find({
                    course: req.course.id,
                    valid: true
                }, function (err, files) {
                    if (err) return next(err);
                    var response = {
                        course: {
                            id: req.course.id,
                            name: req.course.name,
                            content: []
                        }
                    };
                    files.forEach(function (file) {
                        response.course.content.push({
                            fileName: file.fileName,
                            type: file.type,
                            contentLength: file.contentLength,
                            path: file.path
                        });
                    });
                    res.shortResponses.ok(response);
                });
            }
        ])
        .put([
            bodyParser.json(),
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                if (req.user.id != req.course.teacher) return res.shortResponses.forbidden();
                next();
            },
            function (req, res, next) {
                req.course.login = req.body.login || req.course.login;
                req.course.name = req.body.name || req.course.name;
                if (req.body.password) req.course.password = req.body.password;
                req.course.save(function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
                });
            }
        ])
        .delete([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                if (req.user.id != req.course.teacher) return res.shortResponses.forbidden();
                next();
            },
            function (req, res, next) {
                req.course.remove(function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
                });
            }
        ]);

    router.route('/course/:courseId/file')
        .post([
            bodyParser.json(),
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                if (req.user.id != req.course.teacher) return res.shortResponses.forbidden();
                next();
            },
            function (req, res, next) {
                var fileName = req.body.fileName;
                var path = req.body.path;
                var contentType = req.body.contentType;
                var contentLength = req.body.contentLength;
                //TODO check content type

                if (!fileName || !path || !contentType || !contentLength)
                    return res.shortResponses.badRequest({
                        clientError: 'fileName, path, contentType or contentLength not specified.'
                    });
                new models.File({
                    teacher: req.user.id,
                    course: req.course.id,
                    fileName: fileName,
                    type: contentType,
                    contentLength: contentLength,
                    path: path
                }).save(function (err, file) {
                        if (err) return next(err);
                        var s3 = new AWS.S3();
                        s3.getSignedUrl('putObject', {
                            Bucket: parameters.aws.s3Bucket,
                            Key: file.id,
                            ContentType: contentType,
                            ContentLength: contentLength,
                            Expires: 60
                        }, function (err, url) {
                            if (err) return next(err);
                            res.shortResponses.created({url: url});
                        });
                    });


            }
        ]);

    router.route('/course/:courseId/file/:fileId')
        .get([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                var S3 = new AWS.S3();
                S3.getSignedUrl('getObject', {
                    Bucket: parameters.aws.s3Bucket,
                    Key: req.file.id
                }, function (err, url) {
                    if (err) return next(err);
                    res.shortResponses.ok({ url: url });
                });
            }
        ])
        .put([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                if (req.user.id != req.file.teacher != req.course.teacher) return res.shortResponses.forbidden();
                next();
            },
            function (req, res, next) {
                req.file.fileName   = req.body.fileName || req.file.fileName;
                req.file.path       = req.body.path     || req.file.path;
                req.file.save(function (err) {
                    if (err) return next(err);
                    res.shortResponses.ok();
                });
            }
        ])
        .delete([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                if (req.user.id != req.file.teacher != req.course.teacher) return res.shortResponses.forbidden();
                next();
            },
            function (req, res, next) {
                req.file.remove(function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
                });
            }
        ]);

    app.use('/teacher', router);
};