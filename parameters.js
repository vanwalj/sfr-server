/**
 * Created by Jordan on 21/11/14.
 */

module.exports = {
    server: {
        port: process.env.PORT || 7070,
        url: process.env.SERVER_URL
    },
    mandrill: {
        apiKey: process.env.MANDRILL_APIKEY,
        username: process.env.MANDRILL_USERNAME
    },
    mongodb: {
        host: process.env.MONGOLAB_URI || process.env.MONGO_DB || process.env.TRAVIS_DATABASE_URL || 'mongodb://localhost/sfr'
    },
    aws: {
        accessKey: 'AKIAJBHVLXBAKY3RJFIQ',
        secretKey: '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',
        s3Bucket: 'subfeed-reloaded'
    },
    fileUpload: {
        maxSize: 9999999999999,
        types: [
            "image/jpeg", "image/png", "image/tiff", "image/gif",
            "application/pdf",
            "audio/x-m4r", "audio/mp3", "audio/wav",
            "text/plain",
            "video/mp4"
        ]
    },
    lostPassword: {
        resetUrl: 'http://google.fr/'
    },
    notificationServices: {
        apn: {
            key: '',
            cert: ''
        },
        gcm: {
            key: ''
        }
    }
};