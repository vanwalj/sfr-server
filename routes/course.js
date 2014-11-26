/**
 * Created by Jordan on 26/11/14.
 */

var express     = require('express'),
    passport    = require('passport');

module.exports = function (app) {
    var router = express.Router();

    router.route('/mkdir').put([
        passport.authenticate('teacher-bearer', {session: false}),
        function (req, res) {
            var path = req.body.path;
            if (!path) {
                return res.shortResponses.badRequest({clientError: 'path not specified.'});
            }
        }
    ]);

    app.use('/course', router);
};