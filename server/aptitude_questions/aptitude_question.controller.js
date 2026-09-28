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

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const createAptitudeQuestion = async (req, res, next) => {
    try {
        const { courseId, question, answer, difficulty } = req.body;
        if (!question || !String(question).trim() || !difficulty) {
            return res.status(400).json({ status: 400, message: "question and difficulty are required." });
        }
        if (!DIFFICULTIES.includes(difficulty)) {
            return res.status(400).json({ status: 400, message: "Invalid difficulty." });
        }
        const data = await AptitudeQuestionHelper.createQuestion({
            courseId: courseId || null,
            question: String(question).trim(),
            answer: answer ? String(answer).trim() : '',
            difficulty,
        });
        res.status(200).json({ status: 200, message: "Successfully added.", data });
    } catch (error) {
        next(error);
    }
};

const updateAptitudeQuestion = async (req, res, next) => {
    try {
        const data = await AptitudeQuestionHelper.updateQuestion(req.params.id, req.body);
        if (!data) return res.status(404).json({ status: 404, message: "Question not found." });
        res.status(200).json({ status: 200, message: "Successfully updated.", data });
    } catch (error) {
        next(error);
    }
};

Router.post('/generate',       generateQuestions);
Router.post('/create',         createAptitudeQuestion);
Router.get('/list',            listAptitudeQuestions);
Router.put('/attach-course',   attachCourse);
Router.put('/update/:id',      updateAptitudeQuestion);

export default Router;
