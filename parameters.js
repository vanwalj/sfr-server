/**
 * Created by Jordan on 21/11/14.
 */

module.exports = {
    server: {
        port: process.env.PORT || 7070
    },
    mongodb: {
        host: process.env.MONGOLAB_URI || process.env.MONGO_DB || process.env.TRAVIS_DATABASE_URL || 'mongodb://localhost/sfr'
    },
    amqp: {
        url: process.env.CLOUDAMQP_URL || 'amqp://sxhsvvvi:VeSx2CUwh83u8TLfzMjkPUuY6HfDoYbg@bunny.cloudamqp.com/sxhsvvvi'
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
            "application/pdf"
        ]
    }
};