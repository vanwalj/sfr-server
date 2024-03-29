/**
 * Created by Jordan on 21/11/14.
 */

var fs              = require('fs'),
    path            = require('path'),
    winston         = require('winston'),
    passport        = require('passport'),
    shortResponses  = require('express-short-responses'),
    express         = require('express'),
    morgan          = require('morgan'),
    cors            = require('cors'),
    app             = express(),
    parameters      = require('../parameters');

// Global middleware
app.use(passport.initialize());
app.use(cors());
app.use(shortResponses);

// CORS pre-flight
app.use('*', cors());

if (process.env.NODE_ENV != 'mocha') {
    app.use(morgan('combined'));
}

app.use(function (err, req, res, next) {
    winston.error(err);
    return res.shortResponses.internalServerError();
});

// Load routes.
fs.readdirSync(__dirname).filter(function(el) {
    return path.basename(__filename) != el && el.indexOf('.js', el.length - 3) !== -1;
}).forEach(function (el) {
    try {
        require(__dirname + '/' + el)(app);
    }
    catch (e) {
        winston.error('Error loading route ' + el, e);
    }
});

// Listen
app.listen(parameters.server.port);
