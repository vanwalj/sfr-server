/**
 * Created by Jordan on 28/11/14.
 */

module.exports = function (mongoose) {
    var fileSchema = mongoose.Schema({
        teacher: {type: mongoose.Schema.Types.ObjectId, ref: 'Teacher'},
        course: {type: mongoose.Schema.Types.ObjectId, ref: 'Course'},
        fileName: {type: String},
        type: {type: String},
        url: {type: String},
        path: {type: String},
        valid: {type: Boolean, default: false}
    });

    return mongoose.model('File', fileSchema);
};