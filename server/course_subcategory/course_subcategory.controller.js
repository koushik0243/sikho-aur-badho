import express from 'express';
import * as CourseSubCategoryHelper from './course_subcategory.service.js';

const Router = express.Router();

const createCourseSubCategory = async (req, res, next) => {
    try {
        const userId = req.user?._id || null;
        const data = await CourseSubCategoryHelper.createCourseSubCategory(req.body, userId);
        res.status(200).json({ status: 200, message: "Successfully added.", data });
    } catch (error) {
        next(error);
    }
};

const editCourseSubCategory = async (req, res, next) => {
    try {
        const data = await CourseSubCategoryHelper.editCourseSubCategory(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const updateCourseSubCategory = async (req, res, next) => {
    try {
        const data = await CourseSubCategoryHelper.updateCourseSubCategory(req.params.id, req.body);
        res.status(200).json({ status: 200, message: "Successfully updated.", data });
    } catch (error) {
        next(error);
    }
};

const listCourseSubCategory = async (req, res, next) => {
    try {
        const { status, categoryId } = req.query;
        const data = await CourseSubCategoryHelper.listCourseSubCategory({ status, categoryId });
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const listCourseSubCategoryPagination = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, categoryId } = req.query;

        const [subcategories, total] = await Promise.all([
            CourseSubCategoryHelper.listCourseSubCategoryPagination(page, limit, { status, categoryId }),
            CourseSubCategoryHelper.getCourseSubCategoryCount({ status, categoryId })
        ]);
        res.status(200).json({
            status: 200,
            message: "Successfully fetched.",
            data: subcategories,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        next(error);
    }
};

const deleteCourseSubCategory = async (req, res, next) => {
    try {
        const data = await CourseSubCategoryHelper.deleteCourseSubCategory(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully deleted.", data });
    } catch (error) {
        next(error);
    }
};

const checkCourseSubCategoryName = async (req, res, next) => {
    try {
        const { name, excludeId } = req.query;
        if (!name) {
            return res.status(400).json({ status: 400, message: "name is required." });
        }
        const data = await CourseSubCategoryHelper.checkCourseSubCategoryName(name, excludeId || null);
        res.status(200).json({ status: 200, message: "Successfully checked.", data });
    } catch (error) {
        next(error);
    }
};

Router.post('/create', createCourseSubCategory);
Router.get('/list', listCourseSubCategory);
Router.get('/list-pagination', listCourseSubCategoryPagination);
Router.get('/check', checkCourseSubCategoryName);
Router.get('/edit/:id', editCourseSubCategory);
Router.put('/update/:id', updateCourseSubCategory);
Router.get('/delete/:id', deleteCourseSubCategory);
Router.get('/:id', editCourseSubCategory);

export default Router;
