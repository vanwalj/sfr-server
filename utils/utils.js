/**
 * Created by Jordan on 25/11/14.
 */

var path = require('path');

module.exports = {
    fileBasename: function (fileName) {
        return path.basename(fileName, path.extname(fileName));
    }
};