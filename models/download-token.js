/**
 * Created by Jordan on 28/12/14.
 */

var parameters = require('../parameters');

module.exports = function (mongoose) {

    var downloadTokenSchema = mongoose.Schema({
        value: {type: String, required: true, default: hat() },
        file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
        valid: { type: Boolean, required: true, default: true }
    });

    downloadTokenSchema.virtual('downloadUrl').get(function () {
        return parameters.server.url + '/' + this.file + '/' + this.value;
    });

    return mongoose.model('DownloadToken', downloadTokenSchema);

};