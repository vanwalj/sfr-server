/**
 * Created by Jordan on 12/11/2014.
 */

var express     = require('express'),
    bodyParser  = require('body-parser'),
    winston     = require('winston'),
    models      = require('../models');

module.exports = function (app) {
    var router = express.Router();

    router.route('/confirm-upload')
        .post([
            bodyParser.text(),
            function (req, res, next) {
                winston.log('info', 'SNS Header', req.headers);
                winston.log('info', 'Receive a notification from SNS', { content: req.body });
                res.shortResponses.ok();
            }
        ]);

    app.use('/aws', router);
};