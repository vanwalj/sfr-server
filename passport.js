/**
 * Created by Jordan on 21/11/14.
 */

var passport = require('passport'),
    BearerStrategy = require('passport-http-bearer'),
    BasicStrategy = require('passport-http').BasicStrategy,
    models = require('./models');

passport.use(new BearerStrategy(
    function (token, done) {
        models.token.findOne({value: token}, function (err, token) {
            if (err) return done(err);
            if (!token) return done(null, false);
            models.user.find(token.user, function (err, user) {
                if (err) return done(err);
                if (!user) return done(null, false);
                return done(null, user, { scope: 'all' });
            });
        });
    }
));

passport.use(new BasicStrategy(
    function (login, password, done) {
        console.log('lol');
        models.user.findOne({login: login}, function (err, user) {
            if (err) return done(err);
            if (!user) return done(null, false);
            user.validPassword(password, function (err, login) {
                if (err) return done(err);
                if (!login) return done(null, false);
                return done(null, user);
            });
        });
    }
));