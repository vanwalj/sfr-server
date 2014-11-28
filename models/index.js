/**
 * Created by Jordan on 21/11/14.
 */

var mongoose        = require('mongoose'),
    fs              = require('fs'),
    path            = require('path'),
    parameters      = require('../parameters'),
    changeCase      = require('change-case'),
    utils           = require('../utils/utils');

mongoose.connect(parameters.mongodb.host, function () {
    if (process.env.FLUSH_DB)
        mongoose.connection.db.dropDatabase();
});

fs.readdirSync(__dirname).filter(function(fileName) {
    return path.basename(__filename) != fileName && fileName.indexOf('.js', fileName.length - 3) !== -1;
}).forEach(function (fileName) {
    try {
        var name = changeCase.pascalCase(utils.fileBasename(fileName));
        module.exports[name] = require(__dirname + '/' + fileName)(mongoose);
    }
    catch (e) {
        console.log('Error loading model ' + fileName);
        console.log(e);
    }
});