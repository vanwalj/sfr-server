/**
 * Created by Jordan on 25/11/14.
 */

var path = require('path');

module.exports = {
    fileBaseName: function (fileName) {
        var fileExtension = path.extname(fileName);
        return fileName.substring(0, fileName.indexOf(fileExtension, fileName.length - fileExtension.length))
    }
};