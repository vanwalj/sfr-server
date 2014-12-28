/**
 * Created by Jordan on 26/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    winston     = require('winston'),
    parameters  = require('../parameters'),
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
     * @apiHeader {String} Authorization basic access authentication (see: http://en.wikipedia.org/wiki/Basic_access_authentication#Client_side)
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=="
     *     }
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
     * @apiError Unauthorized Wrong credentials
     */
    router.route('/')
        .get([
            passport.authenticate('course-bearer', {session : false}),
            function (req, res, next) {
                models.File.find({
                    course: req.user.id,
                    valid: true,
                    published: true
                }, function (err, files) {
                    var content = [];
                    files.forEach(function (file) {
                        content.push({
                            id: file._id,
                            path: file.path,
                            fileName: file.fileName,
                            type: file.type,
                            contentLength: file.contentLength,
                            publishedAt: file.publishedAt
                        });
                    });
                    res.shortResponses.ok({
                        id: req.user.id,
                        name: req.user.name,
                        content: content
                    });
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