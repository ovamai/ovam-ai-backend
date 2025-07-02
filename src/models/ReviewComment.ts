import mongoose from 'mongoose';

const reviewCommentSchema = new mongoose.Schema({
  commentId: Number,
  file: String,
  start_line: Number,
  end_line: Number,
  severity: String,
  category: String,
  title: String,
  comment: String,
  suggestion: String,
  code_diff: String,
  githubUrl: String,
  prNumber: Number,
  createdAt: Date,
  updatedAt: Date,
});

export default mongoose.model('ReviewComment', reviewCommentSchema);
