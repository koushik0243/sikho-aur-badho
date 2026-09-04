import dotenv from 'dotenv';
dotenv.config();
import './_helpers/db.js';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import protect from './middleware/authMiddleware.js';

// Recreate __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Routes inclusion
import chapterRouter from './chapters/chapter.controller.js';
import courseCategoryRouter from './course_category/course_category.controller.js';
import courseSubCategoryRouter from './course_subcategory/course_subcategory.controller.js';
import courseRouter from './courses/course.controller.js';
import topicRouter from './topics/topic.controller.js';
import courseAssignmentRouter from './course_assignments/course_assignment.controller.js';

import organizationRouter from './organizations/organization.controller.js';
import creditRouter from './credits/credit.controller.js';

import organizationCourseRouter from './organization_course/organization_course.controller.js';
import subscriptionRouter from './subscription/subscription.controller.js';
import coursePricingRouter from './course_pricing/course_pricing.controller.js';
import planRouter from './plans/plan.controller.js';
import organizationCourseAssignmentRouter from './organization_course_assignment/organization_course_assignment.controller.js';
import organizationCreditAssignmentRouter from './organization_credit_assignment/organization_credit_assignment.controller.js';

import industryTypeRouter from './industry_type/industry_type.controller.js';
import tagRouter from './tags/tag.controller.js';
import certificateTemplateRouter from './certificate_template/certificate_template.controller.js';
import roleRouter from './roles/role.controller.js';
import permissionRouter from './permissions/permission.controller.js';
import rolePermissionRouter from './role_permissions/role_permission.controller.js';
import userRouter from './users/user.controller.js';
import orderRouter from './orders/order.controller.js';
import invoiceRouter from './invoices/invoice.controller.js';
import supportTicketRouter from './support_tickets/support_ticket.controller.js';
import creditUsedRouter from './credit_used/credit_used.controller.js';
import quizQuestionRouter from './quiz_questions/quiz_question.controller.js';
import quizAttemptRouter from './quiz_attempts/quiz_attempt.controller.js';
import aptitudeQuestionRouter from './aptitude_questions/aptitude_question.controller.js';
import aptitudeAttemptRouter from './aptitude_attempts/aptitude_attempt.controller.js';
import progressRouter from './progress/progress.controller.js';
import noteRouter from './notes/note.controller.js';
import reviewRouter from './reviews/review.controller.js';
import speechRouter from './speech/speech.controller.js';
import organizationSignupRouter from './organization_signup/organization_signup.controller.js';
import orgDashboardRouter from './org_dashboard/org_dashboard.controller.js';
import activityLogRouter from './activity_log/activity_log.controller.js';

const app = express();
// Gzip/deflate every response above ~1KB (JSON list/pagination payloads are the main
// beneficiary — every page in the app fetches one of these on load). Cheap CPU cost,
// large win on payload transfer time, especially over mobile/slow connections.
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://staging.sikhoaurbadho.com',
    'https://api.staging.sikhoaurbadho.com'
];

app.use(cors({
   origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type, Authorization, Origin, X-Requested-With, Accept, currency, timezone, country",
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Serve uploaded files as static assets (must come after cors so CORS headers are applied)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.use('/course-category', protect, courseCategoryRouter);
app.use('/course-subcategory', protect, courseSubCategoryRouter);
app.use('/course', protect, courseRouter);
app.use('/chapter', protect, chapterRouter);
app.use('/topic', protect, topicRouter);
app.use('/course-assignment', protect, courseAssignmentRouter);

app.use('/course-pricing', protect, coursePricingRouter);
app.use('/plan', protect, planRouter);
app.use('/subscription', protect, subscriptionRouter);

app.use('/organization', protect, organizationRouter);
app.use('/credit', protect, creditRouter);

app.use('/organization-course', protect, organizationCourseRouter);
app.use('/organization-course-assignment', protect, organizationCourseAssignmentRouter);
app.use('/organization-credit-assignment', protect, organizationCreditAssignmentRouter);
app.use('/industry-type', protect, industryTypeRouter);
app.use('/tags', protect, tagRouter);
app.use('/certificate-template', protect, certificateTemplateRouter);
app.use('/role', protect, roleRouter);
app.use('/permission', protect, permissionRouter);
app.use('/role-permission', protect, rolePermissionRouter);
app.use('/order', protect, orderRouter);
app.use('/invoice', protect, invoiceRouter);
app.use('/support-ticket', protect, supportTicketRouter);
app.use('/credit-used', protect, creditUsedRouter);
app.use('/quiz-questions', protect, quizQuestionRouter);
app.use('/quiz-attempt',   protect, quizAttemptRouter);
app.use('/aptitude-questions', protect, aptitudeQuestionRouter);
app.use('/aptitude-attempt', protect, aptitudeAttemptRouter);
app.use('/progress',       protect, progressRouter);
app.use('/note', protect, noteRouter);
app.use('/review', protect, reviewRouter);
app.use('/speech', protect, speechRouter);
// Public — self-service store owner signup, no auth required (creates its own org + owner account).
app.use('/signup', organizationSignupRouter);
app.use('/org-dashboard', protect, orgDashboardRouter);
app.use('/activity-log', protect, activityLogRouter);
app.use('/user', userRouter);

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    status: statusCode,
    message: error.message || 'Internal server error'
  });
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

