import express from 'express';
import * as Service from './quiz_attempt.service.js';

const Router = express.Router();

const submit = async (req, res, next) => {
  try {
    const { topicId, courseId, chapterId, answers } = req.body;
    if (!topicId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ status: 400, message: 'topicId and answers are required.' });
    }
    const attempt = await Service.submitAttempt({
      userId: req.user._id,
      topicId,
      courseId:   courseId  || null,
      chapterId:  chapterId || null,
      answers,
    });
    res.status(200).json({ status: 200, message: 'Quiz evaluated.', data: attempt });
  } catch (error) {
    next(error);
  }
};

const history = async (req, res, next) => {
  try {
    const { topicId } = req.query;
    if (!topicId) return res.status(400).json({ status: 400, message: 'topicId is required.' });
    const data = await Service.getAttemptHistory({ userId: req.user._id, topicId });
    res.status(200).json({ status: 200, message: 'Success.', data });
  } catch (error) {
    next(error);
  }
};

const byCourse = async (req, res, next) => {
  try {
    const { courseId, chapterId } = req.query;
    if (!courseId) return res.status(400).json({ status: 400, message: 'courseId is required.' });
    const data = await Service.getAttemptsByCourse({
      userId:    req.user._id,
      courseId,
      chapterId: chapterId || null,
    });
    res.status(200).json({ status: 200, message: 'Success.', data });
  } catch (error) {
    next(error);
  }
};

const byCourseAdmin = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ status: 400, message: 'courseId is required.' });
    const data = await Service.getAttemptsByCourseAdmin({ courseId });
    res.status(200).json({ status: 200, message: 'Success.', data });
  } catch (error) {
    next(error);
  }
};

Router.post('/submit',       submit);
Router.get('/history',       history);
Router.get('/course',        byCourse);
Router.get('/course-all',    byCourseAdmin);

export default Router;
