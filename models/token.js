/**
 * Created by Jordan on 21/11/14.
 */

module.exports = function (mongoose) {

    var tokenSchema = mongoose.Schema({
        value: {type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    });

    return mongoose.model('Token', tokenSchema);
};