import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import multer from 'multer';
import * as TopicHelper from './topic.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const Router = express.Router();

// ── Multer for topic file uploads (assignment & lesson image) ─────────────────
const topicStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subDir = file.fieldname === 'lesson_image' ? 'lesson-images'
                     : file.fieldname === 'lesson_video' ? 'lesson-videos'
                     : 'assignments';
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', subDir);
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const topicFileFilter = (req, file, cb) => {
    if (file.fieldname === 'lesson_image') {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error(`Invalid image type. Allowed: ${allowed.join(', ')}`));
    } else if (file.fieldname === 'lesson_video') {
        const allowed = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error(`Invalid video type. Allowed: ${allowed.join(', ')}`));
    } else {
        const allowed = ['.doc', '.docx', '.pdf', '.ppt', '.pptx', '.zip', '.rar'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
    }
};

const topicUpload = multer({
    storage: topicStorage,
    fileFilter: topicFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
}).fields([
    { name: 'assignment_file', maxCount: 1 },
    { name: 'lesson_image', maxCount: 1 },
    { name: 'lesson_video', maxCount: 1 }
]);

// Lesson videos have their own, tighter cap than the general 100 MB multer limit above
// (which still applies to assignment_file/lesson_image). The client already blocks
// oversized selections before upload (AddCourseBuilder.js), but that's just UX — the
// request could still reach this endpoint directly, so it's re-checked here too.
const MAX_LESSON_VIDEO_BYTES = 24 * 1024 * 1024;

// multer has already written the file to disk by the time fileFilter/limits can act on
// individual fields, so an oversized lesson_video is caught here instead — delete it
// immediately and fail the request rather than silently saving a video the client would
// have rejected.
function rejectIfLessonVideoTooLarge(files) {
    const file = files.lesson_video?.[0];
    if (!file || file.size <= MAX_LESSON_VIDEO_BYTES) return;
    fs.unlink(file.path, () => {});
    const err = new Error('Lesson video exceeds the 24 MB size limit.');
    err.statusCode = 400;
    throw err;
}

const createTopic = async (req, res, next) => {
    topicUpload(req, res, async (err) => {
        if (err) return next(err);
        try {
            const body = { ...req.body };
            const files = req.files || {};
            rejectIfLessonVideoTooLarge(files);
            if (files.assignment_file?.[0]) {
                body.attachments = [{ name: files.assignment_file[0].originalname, url: `/uploads/assignments/${files.assignment_file[0].filename}` }];
            }
            if (files.lesson_image?.[0]) {
                body.imageUrl = `/uploads/lesson-images/${files.lesson_image[0].filename}`;
            }
            if (files.lesson_video?.[0]) {
                body.videoUrl = `/uploads/lesson-videos/${files.lesson_video[0].filename}`;
            }
            const data = await TopicHelper.createTopic(body);
            res.status(200).json({ status: 200, message: "Successfully added.", data });
        } catch (error) {
            next(error);
        }
    });
};

const editTopic = async (req, res, next) => {
    try {
        const data = await TopicHelper.editTopic(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const updateTopic = async (req, res, next) => {
    topicUpload(req, res, async (err) => {
        if (err) return next(err);
        try {
            const body = { ...req.body };
            const files = req.files || {};
            rejectIfLessonVideoTooLarge(files);
            if (files.lesson_image?.[0]) {
                body.imageUrl = `/uploads/lesson-images/${files.lesson_image[0].filename}`;
            }
            if (files.lesson_video?.[0]) {
                body.videoUrl = `/uploads/lesson-videos/${files.lesson_video[0].filename}`;
            }
            const data = await TopicHelper.updateTopic(req.params.id, body);
            res.status(200).json({ status: 200, message: "Successfully updated.", data });
        } catch (error) {
            next(error);
        }
    });
};

const listTopic = async (req, res, next) => {
    try {
        const { status, courseId, chapterId } = req.query;
        const data = await TopicHelper.listTopic({ status, courseId, chapterId });
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const listTopicPagination = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, courseId, chapterId } = req.query;

        const [topics, total] = await Promise.all([
            TopicHelper.listTopicPagination(page, limit, { status, courseId, chapterId }),
            TopicHelper.getTopicCount({ status, courseId, chapterId })
        ]);
        res.status(200).json({
            status: 200,
            message: "Successfully fetched.",
            data: topics,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        next(error);
    }
};

const deleteTopic = async (req, res, next) => {
    try {
        const data = await TopicHelper.deleteTopic(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully deleted.", data });
    } catch (error) {
        next(error);
    }
};

const checkTopicTitle = async (req, res, next) => {
    try {
        const { title, courseId, chapterId, excludeId } = req.query;
        if (!title || !courseId || !chapterId) {
            return res.status(400).json({ status: 400, message: "title, courseId, and chapterId are required." });
        }
        const data = await TopicHelper.checkTopicTitle(title, courseId, chapterId, excludeId || null);
        res.status(200).json({ status: 200, message: "Successfully checked.", data });
    } catch (error) {
        next(error);
    }
};

Router.post('/create', createTopic);
Router.get('/list', listTopic);
Router.get('/list-pagination', listTopicPagination);
Router.get('/check', checkTopicTitle);
Router.get('/edit/:id', editTopic);
Router.put('/update/:id', updateTopic);
Router.get('/delete/:id', deleteTopic);
Router.get('/:id', editTopic);

export default Router;
