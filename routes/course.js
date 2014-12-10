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
     * @apiName GetCourseBearerToken
     * @apiGroup Course
     * @apiDescription Send a bearer token, so then you can auth subsequent requests.
     *
     * @apiHeader {String} Authorization Course credentials with basic auth format base64(courseName + ":" + coursePassword)
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Basic dGVhY2hlcjp0ZWFjaGVy"
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
     *          "report.pdf": {
     *            "id": "e446584d32145e"
     *          }
     *          "assessment.docx": {
     *            "id": "q4465x8432145q"
     *          }
     *          "exampleFolder": [
     *            "demo.pdf": {
     *              "id": "45da56546dwa"
     *            }
     *          ]
     *        ]
     *      }
     *
     * @apiError Unauthorized Wrong credentials
     */
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