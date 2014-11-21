/**
 * Created by Jordan on 21/11/14.
 */

var fs = require('fs'),
    path = require('path');

module.exports = function (app) {
    fs.readdirSync(__dirname).filter(function(el) {
        return path.basename(__filename) != el && el.indexOf('.js', el.length - 3) !== -1;
    }).forEach(function (el) {
        try {
            require(__dirname + '/' + el)(app);
        }
        catch (e) {
            console.log('Error loading route ' + el);
            console.log(e);
        }
    });
};
