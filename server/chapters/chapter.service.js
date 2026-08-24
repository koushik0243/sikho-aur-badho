import mongoose from 'mongoose';
import Chapter from './chapter.model.js';

const { ObjectId } = mongoose.Types;

const buildQuery = (filters = {}) => {
    const query = { deletedAt: null, status: { $ne: 'inactive' } };
    if (filters.status) query.status = filters.status;
    if (filters.courseId && ObjectId.isValid(filters.courseId)) {
        query.courseId = new ObjectId(filters.courseId);
    }
    return query;
};

export const createChapter = async (data) => {
    try {
        return await new Chapter({
            courseId: data.courseId,
            title: data.title,
            desc: data.desc || '',
            order: data.order,
            isPublished: data.isPublished !== undefined ? data.isPublished : true,
            totalTopics: data.totalTopics || 0,
            status: data.status || 'active'
        }).save();
    } catch (error) {
        throw error;
    }
};

export const editChapter = async (editId) => {
    try {
        return await Chapter.findOne({ _id: editId, deletedAt: null }).lean();
    } catch (error) {
        throw error;
    }
};

export const updateChapter = async (updateId, data) => {
    try {
        const { title, desc, order, isPublished, totalTopics, status, courseId } = data;
        const updateFields = {};

        if (title !== undefined) updateFields.title = title;
        if (desc !== undefined) updateFields.desc = desc;
        if (order !== undefined) updateFields.order = order;
        if (isPublished !== undefined) updateFields.isPublished = isPublished;
        if (totalTopics !== undefined) updateFields.totalTopics = totalTopics;
        if (status !== undefined) updateFields.status = status;
        if (courseId !== undefined) updateFields.courseId = courseId;

        if (Object.keys(updateFields).length === 0) {
            return await Chapter.findOne({ _id: updateId, deletedAt: null }).lean();
        }

        updateFields.updatedAt = new Date();

        return await Chapter.findOneAndUpdate(
            { _id: updateId, deletedAt: null },
            { $set: updateFields },
            { returnDocument: 'before', runValidators: true }
        ).lean();
    } catch (error) {
        throw error;
    }
};

export const listChapter = async (filters = {}) => {
    try {
        const query = buildQuery(filters);
        return await Chapter.find(query).sort({ order: 1, title: 1 }).lean();
    } catch (error) {
        throw error;
    }
};

export const listChapterPagination = async (page, limit, filters = {}) => {
    try {
        const query = buildQuery(filters);
        return await Chapter.find(query)
            .sort({ order: 1, title: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    } catch (error) {
        throw error;
    }
};

export const getChapterCount = async (filters = {}) => {
    try {
        const query = buildQuery(filters);
        return await Chapter.countDocuments(query);
    } catch (error) {
        throw error;
    }
};

export const deleteChapter = async (delId) => {
    try {
        return await Chapter.findOneAndUpdate(
            { _id: delId, deletedAt: null },
            { $set: { deletedAt: new Date(), status: 'inactive' } },
            { returnDocument: 'before' }
        ).lean();
    } catch (error) {
        throw error;
    }
};

export const checkChapterTitle = async (title, courseId, excludeId = null) => {
    try {
        const query = {
            title: { $regex: `^${title}$`, $options: 'i' },
            courseId,
            deletedAt: null
        };
        if (excludeId) query._id = { $ne: excludeId };
        const existing = await Chapter.findOne(query).lean();
        return { isDuplicate: !!existing };
    } catch (error) {
        throw error;
    }
};
