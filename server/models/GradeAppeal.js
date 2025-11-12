import mongoose from "mongoose";

const GradeAppealSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true
    },
    internshipGrade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipGrade",
      required: true
    },
    originalSupervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true
    },
    appealReason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "reviewing", "completed"],
      default: "pending"
    },
    khoa: {
      type: String,
      required: true,
      trim: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNote: {
      type: String,
      default: ""
    },
    newSupervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
GradeAppealSchema.index({ student: 1, status: 1 });
GradeAppealSchema.index({ khoa: 1, status: 1 });
GradeAppealSchema.index({ newSupervisor: 1, status: 1 });
GradeAppealSchema.index({ internshipGrade: 1 });
GradeAppealSchema.index({ createdAt: -1 });

// Only one pending/reviewing appeal per grade
GradeAppealSchema.index(
  { internshipGrade: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      status: { $in: ["pending", "reviewing"] }
    }
  }
);

export default mongoose.model("GradeAppeal", GradeAppealSchema);
