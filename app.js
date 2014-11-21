/**
 * Created by Jordan on 21/11/14.
 */

var express = require('express'),
    app = express(),
    configuration = require('./configuration'),
    passport = require('passport'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());
require('./passport');

require('./routes')(app);

app.listen(configuration.server.port);