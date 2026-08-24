import mongoose from "mongoose";
const Schema = mongoose.Schema;

const TopicSchema = new Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true, index: true },
  title: { type: String, required: true },
  desc: { type: String, required: false, default: "" },  

  // Content fields
  imageUrl: { type: String, required: false, default: null }, // for image type
  video_type: { type: String, enum: ["document", "quiz", "file", "zoom_link", "lesson", "assignment"], default: "file" }, // for video type
  quizSettings: { type: mongoose.Schema.Types.Mixed, default: null },
  videoUrl: { type: String, required: false, default: null }, // for video type  
  duration_hr: { type: String, required: false, default: '0' },
  duration_min: { type: String, required: false, default: '0' },
  duration_sec: { type: String, required: false, default: '0' },
  attachments: [{ name: String, url: String }],
  order: { type: Number, required: true },
  isPreview: { type: Boolean, required: false, default: false },
  isPublished: { type: Boolean, required: false, default: true },
  deletedAt: { type: Date, required: false, default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// listTopic/listTopicPagination (topic.service.js) filter by chapterId + deletedAt
// and sort by order -- compound index covers the per-chapter listing hot path.
TopicSchema.index({ chapterId: 1, deletedAt: 1, order: 1 });

// course.service.js listCoursesWithStats aggregates Topic counts matching
// { courseId: { $in: [...] }, deletedAt: null } grouped by courseId -- mirrors
// the equivalent compound index on Chapter for the same aggregation shape.
TopicSchema.index({ courseId: 1, deletedAt: 1 });

export default mongoose.model("Topic", TopicSchema);
