/**
 * Created by Jordan on 21/11/14.
 */

var passport = require('passport'),
    BearerStrategy = require('passport-http-bearer'),
    BasicStrategy = require('passport-http').BasicStrategy,
    models = require('./../models/index');

passport.use('school-bearer', new BearerStrategy(
    function (bearer, done) {

        models.SchoolToken.findOne({
            value: bearer
        }, function (err, schoolToken) {
            if (err) return done(err);
            if (!schoolToken) return done(null, false);
            models.School.findOne({
                _id: schoolToken.teacher
            }, function (err, school) {
                if (err) return done(err);
                if (!school) return done(null, false);
                return done(null, school, { scope: 'all' });
            });
        });
    }
));

passport.use('school-basic', new BasicStrategy(
    function (login, password, done) {
        models.School.findOne({
            login: login
        }, function (err, school) {
            if (err) return done(err);
            if (!school) return done(null, false);
            school.validPassword(password, function (err, login) {
                if (err) return done(err);
                if (!login) return done(null, false);
                return done(null, school);
            });
        });
    }
));


passport.use('teacher-bearer', new BearerStrategy(
    function (bearer, done) {

        models.TeacherToken.findOne({
            value: bearer
        }, function (err, teacherToken) {
            if (err) return done(err);
            if (!teacherToken) return done(null, false);
            models.Teacher.findOne({
                _id: teacherToken.teacher
            }, function (err, teacher) {
                if (err) return done(err);
                if (!teacher) return done(null, false);
                return done(null, teacher, { scope: 'all' });
            });
        });
    }
));

passport.use('teacher-basic', new BasicStrategy(
    function (login, password, done) {
        models.Teacher.findOne({
            login: login
        }, function (err, teacher) {
            if (err) return done(err);
            if (!teacher) return done(null, false);
            teacher.validPassword(password, function (err, login) {
                if (err) return done(err);
                if (!login) return done(null, false);
                return done(null, teacher);
            });
        });
    }
));

passport.use('course-bearer', new BearerStrategy(
    function (bearer, done) {
        models.CourseToken.findOne({
            value: bearer
        }, function (err, courseToken) {
            if (err) return done(err);
            if (!courseToken) return done(null, false);
            models.Course.findOne({
                _id: courseToken.course
            }, function (err, course) {
                if (err) return done(err);
                if (!course) return done(null, false);
                return done(null, course, { scope: 'all' });
            });
        });
    }
));