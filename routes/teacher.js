/**
 * Created by Jordan on 21/11/14.
 */

var express     = require('express'),
    passport    = require('passport'),
    winston     = require('winston'),
    models      = require('../models');

module.exports = function (app) {
    var router = express.Router();

    router.route('/token').get([
        passport.authenticate('teacher-basic', {session: false}),
        function (req, res, next) {
            req.user.generateToken(function (err, teacherToken) {
                if (err) return next(err);
                if (!teacherToken) return next(new Error('Unable to generate a teacher token.'));
                winston.log('info', 'New teacher token !', { user: req.user, token: teacherToken });
                return res.shortResponses.ok({ Bearer: teacherToken.value });
            });
        }
    ]);

    router.route('/register').post([
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
                    winston.log('info', 'New teacher !', teacher);
                    return res.shortResponses.ok();
                });
        }
    ]);

    app.use('/teacher', router);
};