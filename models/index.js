/**
 * Created by Jordan on 21/11/14.
 */

var mongoose        = require('mongoose'),
    fs              = require('fs'),
    path            = require('path'),
    configuration   = require('../configuration');

mongoose.connect(configuration.db.host);

fs.readdirSync(__dirname).filter(function(el) {
    return path.basename(__filename) != el && el.indexOf('.js', el.length - 3) !== -1;
}).forEach(function (el) {
    try {
        module.exports[el.substring(0, el.indexOf('.js', el.length - 3))] = require(__dirname + '/' + el)(mongoose);
    }
    catch (e) {
        console.log('Error loading model ' + el);
        console.log(e);
    }
});