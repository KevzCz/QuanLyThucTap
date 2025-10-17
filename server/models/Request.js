import mongoose from "mongoose";

const RequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    idgv: {
      type: String,
      required: true,
      ref: "Account"
    },
    students: [{
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      }
    }],
    type: {
      type: String,
      required: true,
      enum: ["add-student", "remove-student"]
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    internshipSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipSubject",
      required: true
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
RequestSchema.index({ idgv: 1, status: 1 });
RequestSchema.index({ internshipSubject: 1, status: 1 });
RequestSchema.index({ createdAt: -1 });

export default mongoose.model("Request", RequestSchema);
