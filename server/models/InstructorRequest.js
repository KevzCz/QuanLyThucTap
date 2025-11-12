import mongoose from "mongoose";

const InstructorRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true
    },
    requestedInstructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    responseMessage: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Add indexes
InstructorRequestSchema.index({ student: 1, status: 1 });
InstructorRequestSchema.index({ requestedInstructor: 1, status: 1 });
InstructorRequestSchema.index({ createdAt: -1 });

export default mongoose.model("InstructorRequest", InstructorRequestSchema);
