import mongoose from "mongoose";

const PageHeaderSchema = new mongoose.Schema(
  {
    internshipSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipSubject",
      required: true
    },
    // Add instructor field for teacher-specific pages
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GiangVien",
      default: null // null for BCN/Khoa pages, populated for teacher pages
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    order: {
      type: Number,
      required: true,
      default: 1
    },
    audience: {
      type: String,
      enum: ["tat-ca", "sinh-vien", "giang-vien"],
      default: "tat-ca"
    },
    // Add pageType to distinguish between khoa and teacher pages
    pageType: {
      type: String,
      enum: ["khoa", "teacher"],
      default: "khoa"
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

// Virtual populate for sub-headers
PageHeaderSchema.virtual('subs', {
  ref: 'SubHeader',
  localField: '_id',
  foreignField: 'pageHeader'
});

// Indexes for performance - Remove unique constraint to avoid conflicts during reordering
PageHeaderSchema.index({ internshipSubject: 1, order: 1 }); // Already removed unique: true
PageHeaderSchema.index({ instructor: 1, internshipSubject: 1 }); // For teacher-specific queries
PageHeaderSchema.index({ pageType: 1, internshipSubject: 1 }); // For page type filtering

// Add a compound unique index that includes pageType and instructor to allow both khoa and teacher pages
PageHeaderSchema.index({ 
  internshipSubject: 1, 
  pageType: 1, 
  instructor: 1, 
  order: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    isActive: true 
  }
});

export default mongoose.model("PageHeader", PageHeaderSchema);
