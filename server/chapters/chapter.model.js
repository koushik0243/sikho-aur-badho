import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ChapterSchema = new Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  title: { type: String, required: true },
  desc: { type: String, required: false, default: "" },
  order: { type: Number, required: true},
  isPublished: { type: Boolean, default: true },
  totalTopics: { type: Number, required: true, default: 0 },
  deletedAt: { type: Date, required: false, default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// buildQuery (chapter.service.js) always filters deletedAt + status, and
// courseId is the primary per-course lookup filter — courseId alone already
// has an index above, this compound index covers the combined hot path.
ChapterSchema.index({ courseId: 1, deletedAt: 1 });

export default mongoose.model("Chapter", ChapterSchema);

