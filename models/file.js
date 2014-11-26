/**
 * Created by Jordan on 26/11/14.
 */

module.exports = function (mongoose) {
    var fileSchema = mongoose.Schema({
        name: String,
        type: String
    });

    return mongoose.model('File', fileSchema);
};