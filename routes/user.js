/**
 * Created by Jordan on 21/11/14.
 */

var express = require('express');
var passport = require('passport');
var models = require('../models');
var hat = require('hat');

module.exports = function (app) {
    var router = express.Router();

    router.route('/token').get([
        passport.authenticate('basic', {session: false}),
        function (req, res) {
            var token = new models.token({user: req.user.id, value: hat()});
            token.save(function (err, token) {
                if (err || !token) return res.status(500).send();
                return res.json(token);
            });
        }
    ]);

    router.route('/register').post([
        function (req, res) {
            if (!req.body.login || !req.body.password) return res.status(400).end();
            var user = new models.user({login: req.body.login, password: req.body.password});
            user.save(function (err, user) {
                if (err) return res.status(500).end();
                if (!user) return res.status(400).end();
                return res.status(200).end();
            });
        }
    ]);

    app.use('/user', router);
};