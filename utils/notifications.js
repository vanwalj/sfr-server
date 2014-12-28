/**
 * Created by Jordan on 27/12/14.
 */

var apn         = require('apn'),
    gcm         = require('node-gcm'),
    winston     = require('winston'),
    models      = require('../models'),
    parameters  = require('../parameters');

var apnConnection = new apn.Connection({
    key: parameters.notificationServices.apn.key,
    cert: parameters.notificationServices.apn.cert
});

var feedback = new apn.Feedback({
    "batchFeedback": true,
    "interval": 3000
});

feedback.on("feedback", function(devices) {
    devices.forEach(function(item) {
        models.Device.remove({ token: item.device });
    });
});

var gcmSender = new gcm.Sender(parameters.notificationServices.gcm.key);

var notifications = {
    filePublished: function (file) {
        models.Course.findOne({ _id: file.course })
            .populate('registeredDevices')
            .exec(function (err, course) {
                var devices = course.registeredDevices;
                var message = new gcm.Message({
                    data: {
                        message: 'New file published >' + file.fileName
                    }
                });
                var registrationIds = [];

                devices.forEach(function (device) {
                    if (device.platform == 'ios') {
                        var note = new apn.Notification();
                        note.alert = 'New file published >' + file.fileName;

                        apnConnection.pushNotification(note, new apn.Device(device.token));
                    }
                    else if (device.platform == 'android') {
                        registrationIds.push(device.token);
                    }
                    if (registrationIds.length > 0) {
                        gcmSender.send(message, registrationIds, 4, function (err, result) {
                            if (err) return winston.error('Error sending gcm', err);
                            winston.log('info', 'GCM send', result);
                        });
                    }
                });
            });
    }
};

module.exports = notifications;