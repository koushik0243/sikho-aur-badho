import User from './user.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import _ from 'lodash';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import axios from 'axios';
const { ObjectId } = mongoose.Types;

export const createUser = async (newUser) => {
    try {
        const user = await new User(newUser).save();
        const token = generateJwtToken(user);
        return {
            _id: user._id,
            secret: token,
        };

    } catch (error) {
        throw error;
    }
};

export const editUser = async (userId) => {
    try {
        const user = await User.findById(userId).select('-password').populate('user_role', 'name').lean();
        return {
            _id: user._id,
            user_type: user.user_type,
            user_role: user.user_role,
            orgId: user.orgId,
            orgRole: user.orgRole,
            createdBy: user.createdBy,
            managerId: user.managerId,
            // Personal Information
            name: user.name,
            email: user.email,
            phone: user.phone,
            alt_phone: user.alt_phone,
            whatsapp_no: user.whatsapp_no,
            course_language: user.course_language,
            dob: user.dob,
            gender: user.gender,
            bio: user.bio,
            // Work Information
            designation: user.designation,
            department: user.department,
            emp_id: user.emp_id,
            access_start: user.access_start,
            // Address Information
            address1: user.address1,
            address2: user.address2,
            city: user.city,
            state: user.state,
            country: user.country,
            zipcode: user.zipcode,
            // Social Links
            linkedin: user.linkedin,
            twitter: user.twitter,
            facebook: user.facebook,
            instagram: user.instagram,
            youtube: user.youtube,
            // Emergency Contact
            emergency_contact_name: user.emergency_contact_name,
            emergency_contact_phone: user.emergency_contact_phone,
            // Notification Preferences
            email_welcome_noti: user.email_welcome_noti,
            course_assign_noti: user.course_assign_noti,
            weekly_progress_noti: user.weekly_progress_noti,
            live_session_noti: user.live_session_noti,
            language_change_noti: user.language_change_noti,
            // Other
            other_info: user.other_info,
            isVerified: user.isVerified,
            status: user.status,
            createdAt: user.createdAt
        };
    } catch (error) {
        throw error;
    }
};

export const updateUser = async (updateId, updateData) => {
    try {
        const allFields = [
            'user_type', 'user_role', 'orgId', 'orgRole', 'createdBy', 'managerId',
            'name', 'email', 'phone', 'alt_phone', 'whatsapp_no', 'course_language', 'dob', 'gender', 'bio',
            'designation', 'department', 'emp_id', 'access_start',
            'address1', 'address2', 'city', 'state', 'country', 'zipcode',
            'linkedin', 'twitter', 'facebook', 'instagram', 'youtube',
            'emergency_contact_name', 'emergency_contact_phone',
            'email_welcome_noti', 'course_assign_noti', 'weekly_progress_noti',
            'live_session_noti', 'language_change_noti',
            'other_info', 'otp', 'otpExpires', 'resetPasswordToken', 'resetPasswordExpires', 'isVerified', 'status'
        ];
        const updateFields = {};
        for (const field of allFields) {
            if (updateData[field] !== undefined) updateFields[field] = updateData[field];
        }

        // Hash password if provided — findByIdAndUpdate bypasses the pre-save hook
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(updateData.password, salt);
        }

        if (Object.keys(updateFields).length === 0) {
            return await User.findById(updateId).select('-password').lean();
        }

        updateFields.updatedAt = new Date();

        return await User.findByIdAndUpdate(
            new ObjectId(updateId),
            { $set: updateFields },
            { returnDocument: 'before', runValidators: true }
        ).select('-password').lean();
    } catch (error) {
        throw error;
    }
};

export const listUser = async (filters = {}) => {
    try {
        const query = { deletedAt: null };
        if (filters.orgId && ObjectId.isValid(filters.orgId)) {
            query.orgId = new ObjectId(filters.orgId);
        }
        if (filters.user_type) {
            query.user_type = filters.user_type;
        }
        if (filters.orgRole) {
            query.orgRole = filters.orgRole;
        }
        const result = await User.find(query)
            .select('-password')
            .populate('orgId', 'org_name')
            .populate('managerId', 'name')
            .sort({ createdAt: -1 })
            .lean();
        return result;
    } catch (error) {
        throw error;
    }
};

/* Check whether an email and/or whatsapp_no is already registered to another
   (non-deleted) account — used by add-user forms across all 3 portals to block
   duplicate signups before submitting. excludeUserId lets an edit form check
   without tripping over the record's own current values. */
export const checkUserExists = async ({ email, whatsapp_no, excludeUserId }) => {
    try {
        const orConditions = [];
        if (email) orConditions.push({ email });
        if (whatsapp_no) orConditions.push({ whatsapp_no });
        if (orConditions.length === 0) return { emailExists: false, whatsappExists: false };

        const query = { deletedAt: null, $or: orConditions };
        if (excludeUserId && ObjectId.isValid(excludeUserId)) {
            query._id = { $ne: new ObjectId(excludeUserId) };
        }

        const matches = await User.find(query).select('email whatsapp_no').lean();
        const emailExists    = !!email && matches.some(u => u.email === email);
        const whatsappExists = !!whatsapp_no && matches.some(u => u.whatsapp_no === whatsapp_no);
        return { emailExists, whatsappExists };
    } catch (error) {
        throw error;
    }
};

/* List users with pagination */
export const listUserPagination = async (page, limit, filters = {}) => {
    try {
        const query = { deletedAt: null };
        if (filters.user_type) query.user_type = filters.user_type;
        if (filters.orgId && ObjectId.isValid(filters.orgId)) query.orgId = new ObjectId(filters.orgId);
        if (filters.orgRole) query.orgRole = filters.orgRole;
        if (filters.search) {
            query.$or = [
                { name:  { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } },
            ];
        }
        return await User.find(query)
            .select('-password')
            .populate('orgId', 'org_name')
            .populate('managerId', 'name')
            .populate('user_role', 'name display_name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    } catch (error) {
        throw error;
    }
};

/* List all users matching the given filters, unpaginated (for export) */
export const listUserForExport = async (filters = {}) => {
    try {
        const query = { deletedAt: null };
        if (filters.user_type) query.user_type = filters.user_type;
        if (filters.search) {
            query.$or = [
                { name:  { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } },
            ];
        }
        return await User.find(query)
            .select('-password')
            .populate('orgId', 'org_name')
            .populate('managerId', 'name')
            .populate('user_role', 'name display_name')
            .sort({ createdAt: -1 })
            .lean();
    } catch (error) {
        throw error;
    }
};

/* Delete user agaqinst the id */
export const deleteUser = async (delId) => {
    try {
        return await User.findByIdAndUpdate(
            delId,
            { $set: { deletedAt: new Date(), status: 'deleted' } },
            { returnDocument: 'before' }
        ).select('-password').lean();
    } catch (error) {
        throw error;
    }
};

/* Register a new user */
export const registerUser = async (newUser) => {
    try {
        // Password hashing is handled by the pre-save hook in User model
        return await new User(newUser).save();
    } catch (error) {
        throw error;
    }
};

// A user whose account status isn't "active" (inactive/suspended/deleted) must
// never receive a login token, even with correct credentials — checked right
// after the password match succeeds, in every login path below.
const STATUS_LOGIN_MESSAGES = {
    inactive: 'Your account is inactive. Please contact your administrator.',
    suspended: 'Your account has been suspended. Please contact your administrator.',
    deleted: 'This account no longer exists. Please contact your administrator.',
};

function assertActiveStatus(status) {
    if (!status || status === 'active') return;
    const err = new Error(STATUS_LOGIN_MESSAGES[status] || 'Your account is not active. Please contact your administrator.');
    err.statusCode = 400;
    throw err;
}

/* Login user against email and password */
export const loginUser = async (userData) => {
    try {
        const user = await User.findOne({ email: userData.email, deletedAt: null }).lean();
        if (user && user._id) {
            const matchPassword = await bcrypt.compare(userData.password, user.password);
            if (matchPassword) {
                assertActiveStatus(user.status);
                const token = generateJwtToken(user);
                return {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type,
                    status: user.status,
                    secret: token,
                };
            } else {
                throw new Error("Password does not match");
            }
        } else {
            throw new Error("Email not exist");
        }
    } catch (error) {
        throw error;
    }
};

/* Admin login user against email and password */
export const adminLoginUser = async (userData) => {
    try {
        const identifier = userData.identifier || userData.email || userData.phone;
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }],
            user_type: { $in: ['superadmin', 'creator', 'organization', 'employee'] },
            deletedAt: null,
        }).lean();
        if (user && user._id) {
            const matchPassword = await bcrypt.compare(userData.password, user.password);
            if (matchPassword) {
                assertActiveStatus(user.status);
                const token = generateJwtToken(user);
                return {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type,
                    orgId: user.orgId,
                    orgRole: user.orgRole,
                    status: user.status,
                    secret: token,
                };
            } else {
                throw new Error("Password does not match");
            }
        } else {
            throw new Error("User does not exist");
        }
    } catch (error) {
        throw error;
    }
};

/* Get user details against the id or token */ 
export const gmLoginUser = async (userData) => {
    try {
        const email = userData.email?.trim().toLowerCase();

        if (!email) {
            throw new Error('Email is required');
        }

        let user = await User.findOne({ email }).lean();

        if (!user) {
            const fullName = userData.name?.trim() || userData.full_name?.trim() || email.split('@')[0];
            const newUser = new User({
                name: fullName,
                email,
                password: randomBytes(24).toString('hex'),
                user_type: 'employee',
                isVerified: true,
                status: 'active',
            });
            user = await newUser.save();
        }

        const token = generateJwtToken(user);

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            user_type: user.user_type,
            status: user.status,
            secret: token,
        };
    } catch (error) {
        console.error("Error in gmLoginUser:", error);
        throw error;
    }
};

export const adminGoogleLoginUser = async (credential) => {
    try {
        // Verify the Google ID token using Google's tokeninfo endpoint
        const googleRes = await axios.get(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
        );
        const { email, name, email_verified } = googleRes.data;

        if (!email_verified || email_verified === 'false') {
            throw new Error('Google account email is not verified.');
        }

        // Only allow existing admin users — never auto-create admins
        const user = await User.findOne({ email: email.trim().toLowerCase(), user_type: 'superadmin', deletedAt: null }).lean();
        if (!user) {
            throw new Error('No admin account found for this Google account. Please contact your administrator.');
        }

        if (user.status === 'inactive') {
            throw new Error('Your admin account is inactive. Please contact your administrator.');
        }

        const token = generateJwtToken(user);
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            user_type: user.user_type,
            status: user.status,
            secret: token,
        };
    } catch (error) {
        if (error.response) {
            throw new Error('Invalid Google credential. Please sign in again.');
        }
        throw error;
    }
};

export const detailsUser = async (id_token, type) => {
    if (type === "id") {
        const user = await User.findById(id_token).select('name email phone user_type status').lean();
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            user_type: user.user_type,
            status: user.status
        };
    }

    if (type === "token") {
        const decoded = jwt.verify(id_token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id).select('name email phone user_type status').lean();
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            user_type: user.user_type,
            status: user.status
        };
    }
};

export const verifyUserOtp = async (newUser) => {
    try {
        const email = newUser.email;
        const otp = newUser.otp;
        const secret = newUser.jwtSecret;

        const user = await User.findOne({ email });
        if (user.otp !== otp) throw new Error("OTP does not match");
        if (user.otpExpires < Date.now()) throw new Error("OTP has expired");

        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        user.status = 'active';

        await user.save();        

        const response = {
            status: "success",
            message: "User verified successfully",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                user_type: user.user_type,
                status: user.status,
                secret: secret,
            }
        };

        return response;

    } catch (error) {
        throw error;
    }
};

const generatePasswordHash = async (password) => {
    const TEN = 10;
    const salt = await bcrypt.genSalt(TEN);
    return await bcrypt.hash(password, salt);
};

const generateJwtToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            user_type: user.user_type
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE
        }
    );
};
