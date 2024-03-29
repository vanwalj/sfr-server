/**
 * Created by Jordan on 21/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    AWS         = require('aws-sdk'),
    winston     = require('winston'),
    bodyParser  = require('body-parser'),
    _           = require('lodash'),
    s3          = new AWS.S3(),
    parameters  = require('../parameters'),
    mandrill    = require('../utils/mandrill'),
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
     * @api {get} /teacher Get teacher account details
     * @apiVersion 0.1.0
     * @apiName GetTeacher
     * @apiGroup Teacher
     * @apiDescription Get the teacher account infos
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *      {
     *          "login": "teacher@school.kent.ac.uk",
     *          "firstName": "Teacher",
     *          "lastName": "TEACHER",
     *          "title": "Dr.",
     *          "picture": "base64 image"
     *      }
     *
     */
        .get([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                res.shortResponses.ok({
                    login: req.user.login,
                    name: req.user.name,
                    picture: req.user.picture
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
                new models.TeacherToken({ teacher: req.user.id })
                    .save(function (err, teacherToken) {
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
     * @apiParam {String} code New course code
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
                if (!req.body.name || !req.body.code)
                    return res.shortResponses.badRequest( {clientError: 'name or code not specified'} );

                var course = new models.Course({
                    code: req.body.code,
                    name: req.body.name,
                    teacher: req.user._id
                });

                course.save(function (err) {
                    if (err && err.code == 11000) return res.shortResponses.conflict();
                    if (err) return next(err);
                    return res.shortResponses.created({ _id: course.id });
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
     *          { _id: '5fi4m456445adwwd', name: 'Bio PG' },
     *          { _id: 'dahjkdwa45456665', name: 'Bio UG1' }
     *          { _id: '98dihuwa56645654', name: 'Maths' }
     *        ]
     *      }
     *
     */
        .get([
            passport.authenticate('teacher-bearer', {session: false}),
            function (req, res, next) {
                models.Course
                    .find({ teacher: req.user.id })
                    .select('_id name login')
                    .exec()
                    .then(function (courses) {
                        res.shortResponses.ok({ content: courses });
                    }, function (err) {
                        next(err);
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
     *        "_id": "dawdawdwaq4112123"
     *        "name": "Bio",
     *        "content": [
     *          { _id: '5fi4m456445adwwd', path: '/bio/s1', filename: 'week 1.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { _id: 'dlk56456445adwwd', path: '/bio', filename: 'introduction.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { _id: 'gfa56456445adwwd', path: '/bio/s2', filename: 'graph.jpg', type: 'image/jpeg', contentLength: 1235 },
     *          { _id: 'dbv56459945adwwd', path: '/bio/s3', filename: 'week 10.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { _id: 'wqa56456445adwwd', path: '/bio', filename: 'week 10.pdf', type: 'application/pdf', contentLength: 456465 },
     *          { _id: 'xza56456445adwwd', path: '/bio/s1', filename: 'week 10.pdf', type: 'application/pdf', contentLength: 456465 }
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
                models.File
                    .find({
                        course: req.course.id,
                        valid: true
                    })
                    .select('_id path fileName type contentLength createdAt publishedAt')
                    .exec()
                    .find(function (files) {
                        res.shortResponses.ok({
                            _id: req.course.id,
                            name: req.course.name,
                            content: files
                        });
                    }, function (err) {
                        next (err);
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
                req.course.remove(function (err) {
                    if (err) return next(err);
                    return res.shortResponses.ok();
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
     * @apiParam {Boolean} [published] file state
     * @apiParam {String} [comment] file comment
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
     *          url: "https://aws.com/file.jpg?expire=6486",
     *          id: "jdawhdo21q31iopdklaw"
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
                var contentType = req.body.ContentType;
                var contentLength = req.body.ContentLength;
                var published = req.body.published || false;

                if (!fileName || !path || !contentType || !contentLength)
                    return res.shortResponses.badRequest({
                        clientError: 'fileName, path, ContentType or ContentLength not specified.'
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
                    comment: req.body.comment,
                    path: path,
                    published: published
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
                            res.shortResponses.created({ url: url, _id: file.id });
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
                    winston.log('info', 'File download URL created.', url);
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
     * @apiParam {String} [comment] file comment
     * @apiParam {Boolean} [published] file state
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

                req.file.fileName   = req.body.fileName     || req.file.fileName;
                req.file.path       = req.body.path         || req.file.path;
                req.file.published  = req.body.published    || req.file.published;
                req.file.comment    = req.body.comment      || req.file.comment;

                req.file.save(function (err) {
                    if (err) return next(err);
                    winston.log('info', 'File edited.', req.file);
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
                    winston.log('info', 'File deleted.', req.file);
                    return res.shortResponses.ok();
                });
            }
        ]);

    router.route('/reset-password')
    /**
     * @api {post} /teacher/reset-password Post a reset password request
     * @apiVersion 0.1.0
     * @apiName PostResetPassword
     * @apiGroup Teacher
     * @apiDescription Post a reset password request
     *
     * @apiParam {String} login User email
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *
     */
        .post([
            bodyParser.json(),
            function (req, res, next) {
                var login = req.body.login;

                if (!login) return res.shortResponses.badRequest({ clientError: 'Missing login.' });
                models.Teacher
                    .findOne({ login: login })
                    .select('login fullName resetUrl')
                    .exec()
                    .then(function(teacher) {
                        if (!teacher) return res.shortResponses.notFound({ clientError: 'No such login.' });
                        teacher.generateResetToken();
                        mandrill.lostPassword(teacher.login, teacher.fullName, teacher.resetUrl);
                        teacher.save();
                        res.shortResponses.ok();
                    }, function (err) {
                        next(err);
                    });
            }
        ])
    /**
     * @api {put} /teacher/reset-password Put a reset password token
     * @apiVersion 0.1.0
     * @apiName PutResetPassword
     * @apiGroup Teacher
     * @apiDescription Put a reset password token
     *
     * @apiParam {String} token Reset password token
     * @apiParam {String} password New password
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *
     */
        .put([
            bodyParser.json(),
            function (req, res, next) {
                var token = req.body.token;
                var password = req.body.password;

                if (!token || !password) return res.shortResponses.badRequest({ clientError: 'Missing token or password.' });
                models.Teacher.findOne({ resetToken: token }, function(err, teacher) {
                    if (err) return next(err);
                    if (!teacher) return res.shortResponses.notFound({ clientError: 'No such login.' });
                    teacher.password = password;
                    teacher.save(function (err) {
                        if (err) return next(err);
                        res.shortResponses.ok();
                    });
                });
            }
        ]);


    app.use('/teacher', router);
};