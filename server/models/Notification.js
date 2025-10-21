import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    },
    type: {
      type: String,
      required: true,
      enum: [
        "chat-request",
        "chat-message",
        "request-accepted",
        "request-rejected",
        "report-reviewed",
        "student-assigned",
        "student-removed",
        "subject-assigned",
        "file-submitted",
        "deadline-reminder",
        "system",
        "other"
      ],
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    link: {
      type: String,
      default: null,
      trim: true
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    metadata: {
      conversationId: String,
      requestId: String,
      reportId: String,
      subjectId: String,
      studentId: String,
      subHeaderId: String
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// Auto-delete old read notifications after 90 days (optional)
NotificationSchema.index(
  { readAt: 1 }, 
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { isRead: true, readAt: { $ne: null } }
  }
);

export default mongoose.model("Notification", NotificationSchema);
