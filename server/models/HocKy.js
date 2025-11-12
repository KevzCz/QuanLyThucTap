import mongoose from "mongoose";

const hocKySchema = new mongoose.Schema(
  {
    hocKyNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
    namHoc: {
      type: String,
      required: true,
      trim: true,
      // Format: "2024-2025"
    },
    durationStart: {
      type: Date,
      required: true,
    },
    durationEnd: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sinhViens: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SinhVien",
      },
    ],
    // Track import metadata
    importDate: {
      type: Date,
      default: Date.now,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique semester per academic year
hocKySchema.index({ hocKyNumber: 1, namHoc: 1 }, { unique: true });

// Index for filtering by năm học
hocKySchema.index({ namHoc: 1 });

// Virtual to get student count
hocKySchema.virtual("studentCount").get(function () {
  return this.sinhViens ? this.sinhViens.length : 0;
});

// Virtual to check if học kỳ has ended
hocKySchema.virtual("hasEnded").get(function () {
  return new Date() > this.durationEnd;
});

// Ensure virtuals are included in JSON
hocKySchema.set("toJSON", { virtuals: true });
hocKySchema.set("toObject", { virtuals: true });

// Method to add students to this học kỳ
hocKySchema.methods.addStudents = async function (studentIds) {
  const uniqueIds = [...new Set([...this.sinhViens, ...studentIds])];
  this.sinhViens = uniqueIds;
  return this.save();
};

// Method to remove students from this học kỳ
hocKySchema.methods.removeStudents = async function (studentIds) {
  this.sinhViens = this.sinhViens.filter(
    (id) => !studentIds.some((removeId) => removeId.equals(id))
  );
  return this.save();
};

// Static method to find by năm học
hocKySchema.statics.findByNamHoc = function (namHoc) {
  return this.find({ namHoc }).sort({ hocKyNumber: 1 });
};

// Validation: durationEnd must be after durationStart
hocKySchema.pre("save", function (next) {
  if (this.durationEnd <= this.durationStart) {
    next(new Error("Duration end must be after duration start"));
  } else {
    next();
  }
});

export default mongoose.model("HocKy", hocKySchema);
