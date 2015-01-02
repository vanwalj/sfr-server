/**
 * Created by Jordan on 02/01/15.
 */

module.exports = function (mongoose) {
    var schoolSchema = mongoose.Schema();

    return mongoose.model('School', schoolSchema);
};