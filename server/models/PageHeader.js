import mongoose from "mongoose";

const PageHeaderSchema = new mongoose.Schema(
  {
    // Khoa field for BCN-managed pages (pageType: "khoa")
    khoa: {
      type: String,
      trim: true,
      required: false // Required for khoa pages, null for teacher pages
    },
    // Instructor field for teacher-specific pages (pageType: "teacher")
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GiangVien",
      required: false // Required for teacher pages, null for khoa pages
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
    // Distinguish between khoa (BCN-managed) and teacher (GV-managed) pages
    pageType: {
      type: String,
      enum: ["khoa", "teacher"],
      required: true,
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

// Indexes for performance
PageHeaderSchema.index({ khoa: 1, order: 1 });
PageHeaderSchema.index({ instructor: 1, pageType: 1 });
PageHeaderSchema.index({ pageType: 1, khoa: 1 });
PageHeaderSchema.index({ isActive: 1 });
PageHeaderSchema.index({ createdAt: -1 });

// Unique index for khoa pages
PageHeaderSchema.index({ 
  khoa: 1, 
  pageType: 1, 
  order: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    isActive: true,
    pageType: "khoa",
    khoa: { $exists: true, $ne: null }
  }
});

// Unique index for teacher pages
PageHeaderSchema.index({ 
  instructor: 1, 
  pageType: 1, 
  order: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    isActive: true,
    pageType: "teacher",
    instructor: { $exists: true, $ne: null }
  }
});

export default mongoose.model("PageHeader", PageHeaderSchema);
