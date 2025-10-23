import mongoose from "mongoose";

const gradeComponentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['supervisor_score', 'company_score'],
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 10,
    required: true
  },
  weight: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  comment: {
    type: String,
    default: ""
  },
  gradedBy: {
    type: String,
    enum: ['supervisor', 'company'],
    default: 'supervisor'
  },
  gradedAt: {
    type: Date,
    default: Date.now
  }
});

const milestoneSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['start', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'overdue'],
    default: 'pending'
  },
  completedAt: Date,
  submittedDocuments: [{
    fileName: String,
    fileUrl: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  supervisorNotes: String,
  isCustom: {
    type: Boolean,
    default: false
  }
});

// Transform _id to id for frontend compatibility
milestoneSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const internshipGradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  internshipSubject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InternshipSubject',
    required: true
  },
  
  // Type of work (internship or thesis)
  workType: {
    type: String,
    enum: ['thuc_tap', 'do_an'],
    required: true,
    default: 'thuc_tap'
  },
  
  // Company information (for internships)
  company: {
    name: String,
    supervisorName: String,
    supervisorEmail: String,
    supervisorPhone: String,
    address: String
  },
  
  // Timeline and milestones
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  milestones: [milestoneSchema],
  
  // Grading components
  gradeComponents: [gradeComponentSchema],
  
  // Final grade calculation
  finalGrade: {
    type: Number,
    min: 0,
    max: 10
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'draft_completed', 'submitted', 'approved', 'rejected'],
    default: 'not_started'
  },
  
  // Submission tracking
  submittedToBCN: {
    type: Boolean,
    default: false
  },
  submittedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  approvedAt: Date,
  
  // Comments and feedback
  supervisorFinalComment: String,
  gradingNotes: String,
  gradingFiles: [{
    id: String,
    fileName: String,
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  bcnComment: String,
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update timestamps
internshipGradeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate final grade based on components
internshipGradeSchema.methods.calculateFinalGrade = function() {
  if (this.gradeComponents.length === 0) return null;
  
  let totalScore = 0;
  let totalWeight = 0;
  
  this.gradeComponents.forEach(component => {
    totalScore += component.score * component.weight;
    totalWeight += component.weight;
  });
  
  this.finalGrade = totalWeight > 0 ? (totalScore / totalWeight) : 0;
  
  // Calculate letter grade
  if (this.finalGrade >= 9.0) this.letterGrade = 'A+';
  else if (this.finalGrade >= 8.5) this.letterGrade = 'A';
  else if (this.finalGrade >= 8.0) this.letterGrade = 'B+';
  else if (this.finalGrade >= 7.0) this.letterGrade = 'B';
  else if (this.finalGrade >= 6.5) this.letterGrade = 'C+';
  else if (this.finalGrade >= 5.5) this.letterGrade = 'C';
  else if (this.finalGrade >= 5.0) this.letterGrade = 'D+';
  else if (this.finalGrade >= 4.0) this.letterGrade = 'D';
  else this.letterGrade = 'F';
  
  return this.finalGrade;
};

// Method to get progress percentage
internshipGradeSchema.methods.getProgressPercentage = function() {
  if (this.milestones.length === 0) return 0;
  
  const completedMilestones = this.milestones.filter(m => m.status === 'completed').length;
  return Math.round((completedMilestones / this.milestones.length) * 100);
};

// Static method to create default milestones based on work type
internshipGradeSchema.statics.createDefaultMilestones = function(workType, startDate, endDate) {
  const start = new Date(startDate);
  
  if (workType === 'do_an') {
    // Thesis milestone
    return [
      {
        type: 'start',
        title: 'Bắt đầu đồ án',
        description: 'Khởi tạo dự án đồ án tốt nghiệp',
        dueDate: start,
        status: 'pending',
        isCustom: false
      }
    ];
  } else {
    // Internship milestone
    return [
      {
        type: 'start',
        title: 'Bắt đầu thực tập',
        description: 'Khởi tạo quá trình thực tập tại doanh nghiệp',
        dueDate: start,
        status: 'pending',
        isCustom: false
      }
    ];
  }
};

// Static method to create default grade components based on work type
internshipGradeSchema.statics.createDefaultGradeComponents = function(workType) {
  // Always use the same 2 components regardless of work type
  return [
    {
      type: 'supervisor_score',
      score: 0,
      weight: 0.7, // 70%
      comment: '',
      gradedBy: 'supervisor'
    },
    {
      type: 'company_score',
      score: 0,
      weight: 0.3, // 30%
      comment: '',
      gradedBy: 'company'
    }
  ];
};

const InternshipGrade = mongoose.model('InternshipGrade', internshipGradeSchema);

export default InternshipGrade;