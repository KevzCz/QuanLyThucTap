import mongoose from "mongoose";

const SubHeaderSchema = new mongoose.Schema(
  {
    pageHeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PageHeader",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      default: ""
    },
    order: {
      type: Number,
      required: true,
      default: 1
    },
    kind: {
      type: String,
      enum: ["thuong", "thong-bao", "nop-file", "van-ban", "file"],
      default: "thuong"
    },
    audience: {
      type: String,
      enum: ["tat-ca", "sinh-vien", "giang-vien"],
      default: "tat-ca"
    },
    startAt: {
      type: Date,
      default: null
    },
    endAt: {
      type: Date,
      default: null
    },
    fileUrl: {
      type: String,
      default: null
    },
    fileName: {
      type: String,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Remove the unique index constraint - handle ordering in application logic
// SubHeaderSchema.index({ pageHeader: 1, order: 1 }, { unique: true });

// Add a non-unique index for performance
SubHeaderSchema.index({ pageHeader: 1, order: 1 });
SubHeaderSchema.index({ kind: 1 });
SubHeaderSchema.index({ audience: 1 });
SubHeaderSchema.index({ startAt: 1, endAt: 1 }); // For deadline queries
SubHeaderSchema.index({ isActive: 1 });
SubHeaderSchema.index({ createdAt: -1 });

// Virtual for upload status (for nop-file type)
SubHeaderSchema.virtual('uploadStatus').get(function() {
  if (this.kind !== 'nop-file') return null;
  
  const now = new Date();
  if (!this.startAt || !this.endAt) return 'not-configured';
  if (now < this.startAt) return 'not-started';
  if (now > this.endAt) return 'ended';
  return 'active';
});

export default mongoose.model("SubHeader", SubHeaderSchema);
