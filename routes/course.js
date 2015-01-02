/**
 * Created by Jordan on 26/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    winston     = require('winston'),
    bodyParser  = require('body-parser'),
    _           = require('lodash'),
    AWS         = require('aws-sdk'),
    s3          = new AWS.S3(),
    parameters  = require('../parameters'),
    mandrill    = require('../utils/mandrill'),
    models      = require('../models');

module.exports = function (app) {
    var router = express.Router();

    /**
     * @api {get} /course/token Request a course bearer token
     * @apiVersion 0.1.0
     * @apiName GetCourseToken
     * @apiGroup Course
     * @apiDescription Get a bearer token, so then you can auth subsequent requests.
     *
     * @apiParam {String} courseCode The requested course code
     * @apiSuccess {String} Bearer The course bearer token.
     *
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *        "Bearer": "e3d9682632881ff0a555c7a9fedda415"
     *      }
     *
     * @apiError Unauthorized Wrong credentials
     */
    router.route('/token')
        .get([
            bodyParser.json(),
            function (req, res, next) {
                if (!req.body.courseCode) return res.shortResponses.badRequest({clientError: "Course code not provided."});
                models.course
                    .findOne({code: req.body.courseCode})
                    .exec()
                    .then(function (course) {
                        if (!course) return req.shortResponses.notFound({ notFound: "Course not found" });
                        req.course = course;
                        next();
                    }, function (err) {
                        next(err);
                    });
            },
            function (req, res, next) {
                new models.CourseToken({ course: req.course.id })
                    .save(function (err, courseToken) {
                        if (err) return next(err);
                        if (!courseToken) return next(new Error('Unable to generate a course token.'));
                        winston.log('info', 'New course token !', { user: req.user.toJSON(), token: courseToken.toJSON() });
                        return res.shortResponses.ok({ Bearer: courseToken.value });
                    });
            }
        ]);

    /**
     * @api {get} /course Get the course content
     * @apiVersion 0.1.0
     * @apiName GetCourseContent
     * @apiGroup Course
     * @apiDescription Get the course name and folder/files
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     * @apiSuccess {String} name The course name.
     * @apiSuccess {String} content The course content.
     *
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *        "name": "Bio",
     *        "teacher": {
     *          name: {
     *            first: "John",
     *            last: "Doe",
     *            title: "Mr."
     *          },
     *          picture: "base64string"
     *        },
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
     * @apiError Unauthorized Wrong credentials
     */
    router.route('/')
        .get([
            passport.authenticate('course-bearer', {session : false}),
            function (req, res, next) {
                models.File
                    .find({
                        course: req.user.id,
                        valid: true,
                        published: true
                    })
                    .select('_id path fileName type contentLength publishedAt')
                    .exec()
                    .then(function (files) {
                        res.shortResponses.ok({
                            _id: req.user.id,
                            name: req.user.name,
                            content: files
                        });
                    }, function (err) {
                        if (err) return next(err);
                    });
            }
        ]);

    router.param('fileId', function (req, res, next, fileId) {
        models.File.findOne({ _id: fileId, valid: true, published: true }, function (err, file) {
            if (err) return next(err);
            if (!file) return res.shortResponses.notFound({clientError: 'file not found'});
            req.file = file;
            next();
        });
    });

    /**
     * @api {get} /course/:fileId Get the file url
     * @apiVersion 0.1.0
     * @apiName GetFileUrl
     * @apiGroup Course
     * @apiDescription Get the file url
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     * @apiParam {String} fileId The requested file id
     * @apiSuccess {String} url The file url.
     *
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *         "url": "https://subfeed-reloaded.s3.amazonaws.com/image.jpg?AWSAccessKeyId=AKIAIIMRBKA4CPS3NOMQ&Expires=1418184808&Signature=p9UplzRoDzSUZk%2B8wcHRcqMQyEQ%3D"
     *      }
     *
     * @apiError Unauthorized Wrong credentials
     */
    router.route('/:fileId')
        .get([
            passport.authenticate('course-bearer', {session : false}),
            function (req, res, next) {
                if (req.file.course != req.user.id) return res.shortResponses.unauthorized();
                var params = { Bucket: parameters.aws.s3Bucket, Key: req.file.id };
                s3.getSignedUrl('getObject', params, function (err, url) {
                    if (err) return next(err);
                    res.shortResponses.ok({url: url});
                });
            }
        ]);

    router.route('/self-mail/:fileId')
    /**
     * @api {post} /course/self-mail/:fileId Post a self mail request
     * @apiVersion 0.1.0
     * @apiName PostSelfMailRequest
     * @apiGroup Course
     * @apiDescription Post a request to receive a mail containing a download Url
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     * @apiParam {String} fileId The requested file id
     * @apiParam {String} email The user email
     *
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     */
        .post([
            passport.authenticate('course-bearer', {session : false}),
            bodyParser.json(),
            function (req, res, next) {
                if (req.file.course != req.user.id) return res.shortResponses.unauthorized();

                var email = req.body.email;
                if (!email) return res.shortResponses.badRequest({ 'clientError': 'Missing email.' });
                new models.DownloadToken({ file: req.file.id })
                    .save(function (err, downloadToken) {
                        if (err) return next(err);
                        mandrill.selfDownloadEmail(email, downloadToken.downloadUrl);
                        res.shortResponses.ok();
                    });
            }
        ]);

    router.route('/self-mail')
    /**
     * @api {post} /course/self-mail Post a download token
     * @apiVersion 0.1.0
     * @apiName PostDownloadToken
     * @apiGroup Course
     * @apiDescription Post a download token to get a download Url
     *
     * @apiParam {String} token The download token
     *
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *         "url": "https://subfeed-reloaded.s3.amazonaws.com/image.jpg?AWSAccessKeyId=AKIAIIMRBKA4CPS3NOMQ&Expires=1418184808&Signature=p9UplzRoDzSUZk%2B8wcHRcqMQyEQ%3D"
     *      }
     *
     */
        .post([
            bodyParser.json(),
            function (req, res, next) {
                if (!req.body.token) return res.shortResponses.badRequest({ clientError: 'Missing token.' });
                models.DownloadToken.findOne({ value: req.body.token }, function (err, downloadToken) {
                    if (err) return next(err);
                    if (!downloadToken) return res.shortResponses.badRequest({ clientError: "No such token." });
                    if (downloadToken.valid == false) return res.shortResponses.badRequest({ 'clientError': 'Download link expired.' });
                    downloadToken.valid = false;
                    downloadToken.save(function (err) {
                        if (err) return next(err);
                        models.File.findOne({
                            valid: true,
                            published: true
                        }, function (err, file) {
                            if (err) return next(err);
                            if (!file) res.shortResponses.badRequest( {clientError: 'File not available.'} );
                            var params = { Bucket: parameters.aws.s3Bucket, Key: file.id };
                            s3.getSignedUrl('getObject', params, function (err, url) {
                                if (err) return next(err);
                                res.shortResponses.ok({url: url});
                            });

                        });
                    });

                });

            }
        ]);

    router.route('/notification')
    /**
     * @api {post} /course/notifications Post a notification request
     * @apiVersion 0.1.0
     * @apiName PostNotificationRequest
     * @apiGroup Course
     * @apiDescription Post a the device platform and token to register for notifications
     *
     * @apiParam {String} token The device token
     * @apiParam {String} platform The device platform ios|android
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *
     */
        .post([
            passport.authenticate('course-bearer', {session : false}),
            bodyParser.json(),
            function (req, res, next) {
                if (!req.body.token || !req.body.platform) return res.shortResponses.badRequest({ clientError: "Missing deviceToken or platform" });
                models.Device.findOne({ platform: req.body.platform, token: req.body.token }, function (err, device) {
                    if (err) return next(err);
                    if (device) {
                        if (!_.contains(req.user.registeredDevices, device.id)) {
                            req.user.registeredDevices.push(device.id);
                            req.user.save();
                        }
                        return res.shortResponses.ok();
                    } else {
                        new models.Device({
                            platform: req.body.platform,
                            token: req.body.token
                        }).save(function (err, device) {
                                if (err) return next(err);
                                req.user.registeredDevices.push(device.id);
                                req.user.save();
                                return res.shortResponses.ok();
                            });
                    }
                });
            }
        ]);

    app.use('/course', router);
};