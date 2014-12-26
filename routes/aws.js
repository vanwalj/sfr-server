/**
 * Created by Jordan on 12/11/2014.
 */

var express     = require('express'),
    bodyParser  = require('body-parser'),
    winston     = require('winston');

module.exports = function (app) {
    var router = express.Router();


    /**
     * This call is private and should never be called directly, since this is a AWS http hook
     * Called every time a file is uploaded
     */
    router.route('/confirm-upload')
        .post([
            bodyParser.text(),
            function (req, res, next) {
                try {
                    req.body = JSON.parse(req.body);
                } catch (e) {
                    winston.error(e);
                    return res.shortResponses.badRequest();
                }
                next();
            },
            function (req, res, next) {
                winston.log('info', 'Receive a notification from SNS', JSON.parse(req.body.Message).Records[0].s3.object.key);
                res.shortResponses.ok();
            }
        ]);

    app.use('/aws', router);
};