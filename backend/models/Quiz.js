const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }], // Array of options (usually 4 options)
  correctAnswer: { type: String, required: true }, // Must match one of the options exactly
  timeLimit: { type: Number, default: 30 } // Seconds allowed for students to answer
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  creatorId: { type: String, required: true }, // Links the quiz to a specific teacher
  questions: [QuestionSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', QuizSchema);