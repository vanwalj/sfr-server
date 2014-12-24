/**
 * Created by Jordan on 21/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    AWS         = require('aws-sdk'),
    winston     = require('winston'),
    bodyParser  = require('body-parser'),
    _           = require('lodash'),
    sns         = new AWS.SNS(),
    s3          = new AWS.S3(),
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
                var teacher = new models.Teacher({
                    login: req.body.login,
                    password: req.body.password
                });
                teacher.save(function (err, teacher) {
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
                })
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

                var course = new models.Course({
                    login: req.body.login,
                    name: req.body.name,
                    password: req.body.password,
                    teacher: req.user._id
                });

                sns.createTopic({
                   Name: course.id
                }, function (err, data) {
                    if (err) return next(err);
                    course.snsArn = data.TopicArn;
                    course.save(function (err) {
                        if (err) sns.deleteTopic({ TopicArn: course.snsArn }, function (snsErr, data) {
                            if (err && err.code == 11000) return res.shortResponses.conflict();
                            if (err) return next(err);
                        });
                        else return res.shortResponses.created({ courseId: course.id });
                    });
                });

            }
        ])
    /**
     * @api {get} /teacher/course Get the course list
     * @apiVersion 0.1.0
     * @apiName GetCourseList
     * @apiGroup Teacher
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
    /**
     * @api {get} /teacher/course/:courseId Get the course content
     * @apiVersion 0.1.0
     * @apiName GetCourseContent
     * @apiGroup Teacher
     * @apiDescription Get the course content corresponding to the given id
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     * @apiParam {String} courseId courseId to get
     *
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *        "name": "Bio",
     *        "content": [
     *          { id: '5fi4m456445adwwd', path: '/bio/s1', filename: 'week 1.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { id: 'dlk56456445adwwd', path: '/bio', filename: 'introduction.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { id: 'gfa56456445adwwd', path: '/bio/s2', filename: 'graph.jpg', type: 'image/jpeg', contentLength: 1235 },
     *          { id: 'dbv56459945adwwd', path: '/bio/s3', filename: 'week 10.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { id: 'wqa56456445adwwd', path: '/bio', filename: 'week 10.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { id: 'xza56456445adwwd', path: '/bio/s1', filename: 'week 10.pdf', type: 'application/pdf', contentLength: 456465 }
     *        ]
     *      }
     *
     */
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
                            id: file._id,
                            path: file.path,
                            fileName: file.fileName,
                            type: file.type,
                            contentLength: file.contentLength
                        });
                    });
                    res.shortResponses.ok(response);
                });
            }
        ])
    /**
     * @api {put} /teacher/course/:courseId Edit a course
     * @apiVersion 0.1.0
     * @apiName PutCourse
     * @apiGroup Teacher
     * @apiDescription Edit the course details
     *
     * @apiParam {String} courseId courseId to get
     * @apiParam {String} [login] New course login
     * @apiParam {String} [password] New course password
     * @apiParam {String} [name] New course name
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *
     */
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
    /**
     * @api {delete} /teacher/course/:courseId Delete a course
     * @apiVersion 0.1.0
     * @apiName DeleteCourse
     * @apiGroup Teacher
     * @apiDescription Delete a course and all related files
     *
     * @apiParam {String} courseId courseId to delete
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *
     */
        .delete([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                if (req.user.id != req.course.teacher) return res.shortResponses.forbidden();
                next();
            },
            function (req, res, next) {
                sns.deleteTopic({ TopicArn: req.course.snsArn }, function () {
                    req.course.remove(function (err) {
                        if (err) return next(err);
                        return res.shortResponses.ok();
                    });
                });
            }
        ]);

    router.route('/course/:courseId/file')
    /**
     * @api {post} /teacher/course/:courseId/file Post a new file
     * @apiVersion 0.1.0
     * @apiName PostCourseFile
     * @apiGroup Teacher
     * @apiDescription Post a file details to get an upload url,
     * then do a put request against this request with the file content in the request body
     *
     * @apiParam {String} courseId
     * @apiParam {String} fileName file name
     * @apiParam {String} path path where to upload
     * @apiParam {String} ContentType file mime type
     * @apiParam {Number} ContentLength file length
     *
     * @apiParamExample {json} Request-Example:
     *      POST /teacher/course/dakjhwdjwa68786/file
     *      {
     *        "fileName": "report.pdf",
     *        "path": "/week1/report/",
     *        "ContentType": "application/pdf",
     *        "ContentLength": 5566578
     *      }
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *          url: "https://aws.com/file.jpg?expire=6486"
     *      }
     *
     */
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

                if (!fileName || !path || !contentType || !contentLength)
                    return res.shortResponses.badRequest({
                        clientError: 'fileName, path, contentType or contentLength not specified.'
                    });
                if (contentLength > parameters.fileUpload.maxSize)
                    return res.shortResponses.badRequest({
                        clientError: 'File to large.'
                    });
                if (!_.contains(parameters.fileUpload.types, contentType))
                    return res.shortResponses.badRequest({
                        clientError: 'File type not allowed.'
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
    /**
     * @api {get} /teacher/course/:courseId/file/:fileId Get a file download url
     * @apiVersion 0.1.0
     * @apiName GetCourseFile
     * @apiGroup Teacher
     * @apiDescription Get the download url of a file
     *
     * @apiParam {String} courseId courseId to get
     * @apiParam {String} fileId courseId to get
     *
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *          "url": "https://aws.com/file.jpg"
     *      }
     *
     */
        .get([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                s3.getSignedUrl('getObject', {
                    Bucket: parameters.aws.s3Bucket,
                    Key: req.file.id
                }, function (err, url) {
                    if (err) return next(err);
                    res.shortResponses.ok({ url: url });
                });
            }
        ])
    /**
     * @api {put} /teacher/course/:courseId/file/:fileId Edit a file
     * @apiVersion 0.1.0
     * @apiName PutCourseFile
     * @apiGroup Teacher
     * @apiDescription Edit the file details
     *
     * @apiParam {String} courseId courseId to get
     * @apiParam {String} fileId courseId to get
     * @apiParam {String} [fileName] new file name
     * @apiParam {String} [path] new file path
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *
     */
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
    /**
     * @api {delete} /teacher/course/:courseId/file/:fileId Delete a file
     * @apiVersion 0.1.0
     * @apiName DeleteCourseFile
     * @apiGroup Teacher
     * @apiDescription Delete a file
     *
     * @apiParam {String} courseId courseId to get
     * @apiParam {String} fileId courseId to get
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *
     */
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