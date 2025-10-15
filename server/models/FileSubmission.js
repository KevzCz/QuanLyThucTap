import mongoose from "mongoose";

const FileSubmissionSchema = new mongoose.Schema(
  {
    subHeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubHeader",
      required: true
    },
    submitter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["submitted", "reviewed", "accepted", "rejected"],
      default: "submitted"
    },
    reviewNote: {
      type: String,
      default: ""
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    },
    reviewedAt: {
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

// Index for efficient queries
FileSubmissionSchema.index({ subHeader: 1, submitter: 1 });
FileSubmissionSchema.index({ submitter: 1, createdAt: -1 });

export default mongoose.model("FileSubmission", FileSubmissionSchema);
