import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      required: true,
      enum: ["tuan", "thang", "quy", "nam", "khac"],
      default: "tuan"
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "submitted", "reviewed", "approved", "rejected"],
      default: "draft"
    },
    submittedAt: {
      type: Date,
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
    attachments: [{
      fileName: {
        type: String,
        required: true
      },
      fileUrl: {
        type: String,
        required: true
      },
      fileSize: {
        type: Number,
        required: true
      }
    }],
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      validate: {
        validator: async function(v) {
          const account = await mongoose.model("Account").findById(v);
          return account && account.role === "giang-vien";
        },
        message: "Instructor must be giang-vien role"
      }
    },
    internshipSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipSubject",
      required: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate ID before validation
ReportSchema.pre('validate', async function (next) {
  try {
    if (this.id && this.id !== '') return next();

    const prefix = 'BC';
    const currentYear = new Date().getFullYear();
    
    // Find latest ID for current year
    const latest = await this.constructor
      .findOne({ id: new RegExp(`^${prefix}${currentYear}`) })
      .sort({ id: -1 })
      .lean();

    let nextNumber = 1;
    if (latest?.id) {
      const match = latest.id.match(new RegExp(`^${prefix}${currentYear}(\\d+)$`));
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.id = `${prefix}${currentYear}${String(nextNumber).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

// Index for efficient queries
ReportSchema.index({ id: 1 });
ReportSchema.index({ instructor: 1, createdAt: -1 });
ReportSchema.index({ internshipSubject: 1, status: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reportType: 1, status: 1 });
ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ title: 'text' }); // Text index for search

export default mongoose.model("Report", ReportSchema);
