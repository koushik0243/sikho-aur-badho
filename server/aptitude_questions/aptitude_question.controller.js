import express from 'express';
import * as AptitudeQuestionHelper from './aptitude_question.service.js';

const Router = express.Router();

const generateQuestions = async (req, res, next) => {
    try {
        const { courseId, courseTitle, courseDesc, context } = req.body;
        if (!context || !String(context).trim()) {
            return res.status(400).json({ status: 400, message: "context is required." });
        }
        const data = await AptitudeQuestionHelper.generateAndSaveQuestions({
            courseId: courseId || null,
            courseTitle: courseTitle || 'Course',
            courseDesc: courseDesc || '',
            context,
        });
        res.status(200).json({ status: 200, message: `${data.length} questions generated.`, data });
    } catch (error) {
        next(error);
    }
};

const listAptitudeQuestions = async (req, res, next) => {
    try {
        const { courseId, difficulty, status } = req.query;
        if (!courseId) {
            return res.status(400).json({ status: 400, message: "courseId is required." });
        }
        const data = await AptitudeQuestionHelper.listQuestions({ courseId, difficulty, status });
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const attachCourse = async (req, res, next) => {
    try {
        const { ids, courseId } = req.body;
        if (!Array.isArray(ids) || !ids.length || !courseId) {
            return res.status(400).json({ status: 400, message: "ids (array) and courseId are required." });
        }
        const data = await AptitudeQuestionHelper.attachCourseId(ids, courseId);
        res.status(200).json({ status: 200, message: "Successfully attached.", data });
    } catch (error) {
        next(error);
    }
};

Router.post('/generate',       generateQuestions);
Router.get('/list',            listAptitudeQuestions);
Router.put('/attach-course',   attachCourse);

export default Router;
