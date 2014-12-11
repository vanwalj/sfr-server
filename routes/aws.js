/**
 * Created by Jordan on 12/11/2014.
 */

var express     = require('express'),
    bodyParser  = require('body-parser'),
    winston     = require('winston'),
    models      = require('../models');

module.exports = function (app) {
    var router = express.router();

    router.use(function (req, res, next) {
        console.log('ICI');
        next();
    });

    router.route('/confirm-upload')
        .post([
            bodyParser.urlencoded({ extended: false }),
            function (req, res, next) {
                winston.log('info', 'Receive a notification from SNS', req.body);
                res.shortResponses.ok();
            }
        ]);

    app.use('/aws', router);
};