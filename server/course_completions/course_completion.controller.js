import express from 'express';
import mongoose from 'mongoose';
import * as Service from './course_completion.service.js';

const Router = express.Router();

// GET /course-completion?courseId= → this learner's certificate record, or null
const getOne = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ status: 400, message: 'Valid courseId is required.' });
    }
    const data = await Service.getCompletion({ userId: req.user._id, courseId });
    res.status(200).json({ status: 200, message: 'Success.', data: data || null });
  } catch (error) {
    next(error);
  }
};

// GET /course-completion/list → every course this learner holds a certificate for
const list = async (req, res, next) => {
  try {
    const data = await Service.listCompletions({ userId: req.user._id });
    res.status(200).json({ status: 200, message: 'Success.', data });
  } catch (error) {
    next(error);
  }
};

// POST /course-completion/complete { courseId } → records the certificate once
// the server confirms the course is done; idempotent.
const complete = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ status: 400, message: 'Valid courseId is required.' });
    }
    const { record, reason } = await Service.markCourseComplete({ userId: req.user._id, courseId });
    if (!record) return res.status(409).json({ status: 409, message: reason, data: null });
    res.status(200).json({ status: 200, message: 'Course completed.', data: record });
  } catch (error) {
    next(error);
  }
};

Router.get('/',          getOne);
Router.get('/list',      list);
Router.post('/complete', complete);

export default Router;
