/**
 * Created by Jordan on 02/01/15.
 */

module.exports = function (mongoose) {
    var schoolSchema = mongoose.Schema({
        login: { type: String, unique: true },
        password: { type: String }
    });

    return mongoose.model('School', schoolSchema);
};