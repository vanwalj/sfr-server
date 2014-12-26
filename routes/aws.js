/**
 * Created by Jordan on 12/11/2014.
 */

var express     = require('express'),
    bodyParser  = require('body-parser'),
    models      = require('../models'),
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
                var objectKey;
                try {
                    objectKey = JSON.parse(req.body.Message).Records[0].s3.object.key;
                    winston.log('info', 'Receive a notification from SNS for object.', objectKey);
                    models.File.findOne({ _id: objectKey }, function (err, file) {
                        if (err || !file) return res.shortResponses.notFound();
                        file.valid = true;
                        file.save();
                        return res.shortResponses.ok();
                    });
                } catch (e) {
                    winston.error(e);
                    return res.shortResponses.badRequest();
                }
            }
        ]);

    app.use('/aws', router);
};