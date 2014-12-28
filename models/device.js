/**
 * Created by Jordan on 28/12/14.
 */

module.exports = function (mongoose) {

    var deviceSchema = mongoose.Schema({
        platform: {type: String, required: true },
        token: { type: String }
    });

    return mongoose.model('Device', deviceSchema);

};