import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import * as CourseHelper from './course.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const Router = express.Router();

// ── Multer configuration ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subfolder = file.fieldname === 'intro_video' ? 'videos' : 'images';
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'courses', subfolder);
        import('fs').then(({ default: fs }) => {
            fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
        });
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'course_image') {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed for course image.'));
        }
    }
    if (file.fieldname === 'intro_video') {
        if (!file.mimetype.startsWith('video/')) {
            return cb(new Error('Only video files are allowed for intro video.'));
        }
    }
    cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } });
const courseUpload = upload.fields([
    { name: 'course_image', maxCount: 1 },
    { name: 'intro_video', maxCount: 1 }
]);

// Helper: parse body + attach uploaded file paths
const parseBodyWithFiles = (req) => {
    const body = { ...req.body };
    // Parse JSON-stringified arrays sent via FormData
    ['subCatIds', 'tagIds', 'aptitudeSelectedQuestionIds'].forEach(key => {
        if (typeof body[key] === 'string') {
            try { body[key] = JSON.parse(body[key]); } catch { body[key] = [body[key]]; }
        }
    });
    // Boolean coercion from FormData strings
    if (body.enable_review !== undefined) body.enable_review = body.enable_review === 'true' || body.enable_review === true;
    if (body.qna_enabled !== undefined) body.qna_enabled = body.qna_enabled === 'true' || body.qna_enabled === true;
    if (body.aptitudeEnabled !== undefined) body.aptitudeEnabled = body.aptitudeEnabled === 'true' || body.aptitudeEnabled === true;
    // Number coercion
    if (body.max_students !== undefined) body.max_students = Number(body.max_students) || 0;
    // Attach uploaded file paths
    if (req.files?.course_image?.[0]) {
        const img = req.files.course_image[0];
        body.course_image = `/uploads/courses/images/${img.filename}`;
    }
    if (req.files?.intro_video?.[0]) {
        const vid = req.files.intro_video[0];
        body.intro_video = `/uploads/courses/videos/${vid.filename}`;
    }
    return body;
};

const createCourse = async (req, res, next) => {
    courseUpload(req, res, async (err) => {
        if (err) return next(err);
        try {
            const userId = req.user?._id || null;
            const data = await CourseHelper.createCourse(parseBodyWithFiles(req), userId);
            res.status(200).json({ status: 200, message: "Successfully added.", data });
        } catch (error) {
            next(error);
        }
    });
};

const editCourse = async (req, res, next) => {
    try {
        const data = await CourseHelper.editCourse(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const updateCourse = async (req, res, next) => {
    courseUpload(req, res, async (err) => {
        if (err) return next(err);
        try {
            const data = await CourseHelper.updateCourse(req.params.id, parseBodyWithFiles(req));
            res.status(200).json({ status: 200, message: "Successfully updated.", data });
        } catch (error) {
            next(error);
        }
    });
};

const listCourse = async (req, res, next) => {
    try {
        const { status, catId, level, createdBy } = req.query;
        const data = await CourseHelper.listCourse({ status, catId, level, createdBy });
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const listCoursesWithStats = async (req, res, next) => {
    try {
        const { status } = req.query;
        const data = await CourseHelper.listCoursesWithStats({ status });
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const listCoursePagination = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, catId, level, createdBy } = req.query;

        const [courses, total] = await Promise.all([
            CourseHelper.listCoursePagination(page, limit, { status, catId, level, createdBy }),
            CourseHelper.getCourseCount({ status, catId, level, createdBy })
        ]);
        res.status(200).json({
            status: 200,
            message: "Successfully fetched.",
            data: courses,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        next(error);
    }
};

const deleteCourse = async (req, res, next) => {
    try {
        const data = await CourseHelper.deleteCourse(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully deleted.", data });
    } catch (error) {
        next(error);
    }
};

const checkCourseTitle = async (req, res, next) => {
    try {
        const { title, catId, excludeId } = req.query;
        if (!title || !catId) {
            return res.status(400).json({ status: 400, message: "title and catId are required." });
        }
        const data = await CourseHelper.checkCourseTitle(title, catId, excludeId || null);
        res.status(200).json({ status: 200, message: "Successfully checked.", data });
    } catch (error) {
        next(error);
    }
};

Router.post('/create', createCourse);
Router.get('/list', listCourse);
Router.get('/list-with-stats', listCoursesWithStats);
Router.get('/list-pagination', listCoursePagination);
Router.get('/check', checkCourseTitle);
Router.get('/edit/:id', editCourse);
Router.put('/update/:id', updateCourse);
Router.get('/delete/:id', deleteCourse);
Router.get('/:id', editCourse);

export default Router;
