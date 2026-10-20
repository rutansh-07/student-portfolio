const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Title is required']
  },
  description: { 
    type: String 
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
  status: {
    type: String,
    default: 'pending'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be either low, medium, or high'
    },
    default: 'low'
  }
});

// Pre-save hook to trim whitespace from title
taskSchema.pre('save', function() {
  if (this.title) {
    this.title = this.title.trim();
  }
});

module.exports = mongoose.model('Task', taskSchema);
