/**
 * Created by Jordan on 02/01/15.
 */

var express = require('express'),
    bodyParser = require('body-parser'),
    models = require('../models');

module.exports = function (app) {
    var router = express.Router();

    router.param('teacherId', function (req, res, next, teacherId) {
        models.Teacher
            .findOne({ _id: teacherId })
            .exec()
            .then(function (teacher) {
                if (!teacher) return res.shortResponses.notFound({ notFound: 'Teacher not found' });
                req.teacher = teacher;
                next();
            }, function (err) {
                next (err);
            });
    });

    router.route('/')
    /**
     * @api {post} /school Post a new school account
     * @apiVersion 0.1.0
     * @apiName PostSchool
     * @apiGroup School
     * @apiDescription Register a new school
     *
     * @apiParam {String} login New school login
     * @apiParam {String} password New school password
     *
     * @apiSuccessExample Success-Response
     *      HTTP/1.1 200 OK
     *
     */
        .post([
            bodyParser.json(),
            function (req, res, next) {
                if (!req.body.login || !req.body.password) {
                    winston.log('info', 'School register attempt without enough info.', req.body);
                    return res.shortResponses.badRequest({ clientError: "Missing login or password." });
                }
                new models.School().massAssign(req.body).save(function (err, school) {
                    if (err && err.code == 11000) return res.shortResponses.conflict({ clientError: 'Login already exist.' });
                    if (err) return next(err);
                    if (!school) return next(new Error('Unable to register a new school.'));
                    winston.log('info', 'New school !', school.toJSON());
                    return res.shortResponses.ok();
                });
            }
        ])
    /**
     * @api {delete} /school Delete a school account
     * @apiVersion 0.1.0
     * @apiName DeleteSchool
     * @apiGroup School
     * @apiDescription Delete the current school account and all related teachers/courses/files
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
            passport.authenticate('school-basic', {session: false}),
            function (req, res, next) {
                req.user.remove(function (err, school) {
                    if (err) return next(err);
                    winston.log('info', 'School account deleted', school);
                    res.shortResponses.ok();
                })
            }
        ])
    /**
     * @api {get} /school Get the account details
     * @apiVersion 0.1.0
     * @apiName GetSchool
     * @apiGroup School
     * @apiDescription Get the current school account details
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     */
        .get([
            passport.authenticate('school-bearer', { session: false }),
            function (req, res, next) {
                res.shortResponses.ok(req.user);
            }
        ]);

    router.route('/teacher')
    /**
     * @api {post} /school/teacher Post a new teacher account
     * @apiVersion 0.1.0
     * @apiName PostTeacher
     * @apiGroup School
     * @apiDescription Create a new teacher account
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     *
     * @apiParam {String} login New teacher login
     * @apiParam {String} password New teacher password
     * @apiParam {String} picture New teacher picture
     * @apiParam {String} name.first New teacher first name
     * @apiParam {String} name.last New teacher last name
     * @apiParam {String} name.title New teacher title
     *
     *
     */
        .post([
            passport.authenticate('school-bearer', {session: false}),
            bodyParser.json(),
            function (req, res, next) {
                new models.Teacher({ school: req.user._id }).massAssign(req.body).save(function (err) {
                    if (err) next(err);
                    return res.shortResponses.ok();
                });
            }
        ])
    /**
     * @api {get} /school/teacher Get teacher accounts
     * @apiVersion 0.1.0
     * @apiName GetTeachers
     * @apiGroup School
     * @apiDescription Get teacher list for school
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     */
        .get([
            passport.authenticate('school-bearer', {session: false}),
            function (req, res, next) {
                models.Teacher.find({ course: req.user._id }).select('_id').exec()
                    .then(function (teachers) {
                        res.shortResponses.ok(teachers);
                    }, function (err) {
                        if (err) return next(err);
                    });
            }
        ]);

    router.route('/teacher/:teacherId')
    /**
     * @api {get} /school/teacher Get teacher accounts
     * @apiVersion 0.1.0
     * @apiName GetTeachers
     * @apiGroup School
     * @apiDescription Get teacher list for school
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     */
        .get([
            passport.authenticate('school-bearer', { session: false }),
            function (req, res, next) {
                if (req.teacher.school != req.user._id) return res.shortResponses.unauthorized();
                return res.shortResponses.ok(req.teacher);
            }
        ])
    /**
     * @api {put} /school/teacher/:teacherId Put teacher account
     * @apiVersion 0.1.0
     * @apiName PutTeacher
     * @apiGroup School
     * @apiDescription Edit a teacher account
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     */
        .put([
            passport.authenticate('school-bearer', { session: false }),
            function (req, res, next) {
                if (req.teacher.school != req.user._id) return res.shortResponses.unauthorized();
                req.teacher.massAssign(req.body);
                req.teacher.save(function (err) {
                    if (err) return next(err);
                    res.shortResponses.ok();
                });
            }
        ])
    /**
     * @api {delete} /school/teacher/:teacherId Delete teacher account
     * @apiVersion 0.1.0
     * @apiName DeleteTeacher
     * @apiGroup School
     * @apiDescription Delete a teacher account
     *
     * @apiHeader {String} Authorization Bearer token
     * @apiHeaderExample {json} Header-Example:
     *     {
     *       "Authorization": "Bearer e3d9682632881ff0a555c7a9fedda415"
     *     }
     */
        .delete([
            passport.authenticate('school-bearer', {session: false}),
            function (req, res, next) {
                if (req.teacher.school != req.user._id) return res.shortResponses.unauthorized();
                req.teacher.remove(function (err) {
                    if (err) next(err);
                    res.shortResponses.ok();
                });
            }
        ]);

    app.use('/school', router);
};