import mongoose from "mongoose";

const GiangVienSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
      validate: {
        validator: async function(v) {
          const account = await mongoose.model("Account").findById(v);
          return account && account.role === "giang-vien";
        },
        message: "Account must be giang-vien role"
      }
    },
    khoa: {
      type: String,
      required: true,
      trim: true
    },
    managedStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account"
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for account details
GiangVienSchema.virtual('accountDetails', {
  ref: 'Account',
  localField: 'account',
  foreignField: '_id',
  justOne: true
});

// Virtual for current student count
GiangVienSchema.virtual('currentStudentCount').get(function() {
  return this.managedStudents ? this.managedStudents.length : 0;
});

// Virtual for maxStudents - calculated based on khoa distribution
GiangVienSchema.virtual('maxStudents').get(function() {
  // This will be calculated dynamically by querying the database
  // Default to 10 if not yet calculated
  return this._maxStudents || 10;
});

// Method to calculate and update maxStudents for all instructors in a khoa
GiangVienSchema.statics.updateMaxStudentsForKhoa = async function(khoa) {
  const SinhVien = mongoose.model("SinhVien");
  
  // Count total students and instructors in this khoa
  const [totalStudents, instructors] = await Promise.all([
    SinhVien.countDocuments({ khoa }),
    this.find({ khoa })
  ]);
  
  const totalInstructors = instructors.length;
  
  if (totalInstructors === 0) return;
  
  // Calculate max students per instructor (rounded up)
  const maxPerInstructor = Math.ceil(totalStudents / totalInstructors);
  
  // Update each instructor's calculated maxStudents
  for (const instructor of instructors) {
    instructor._maxStudents = maxPerInstructor;
  }
  
  return maxPerInstructor;
};

// Method to get calculated maxStudents for this instructor
GiangVienSchema.methods.getMaxStudents = async function() {
  const SinhVien = mongoose.model("SinhVien");
  
  const [totalStudents, totalInstructors] = await Promise.all([
    SinhVien.countDocuments({ khoa: this.khoa }),
    this.constructor.countDocuments({ khoa: this.khoa })
  ]);
  
  if (totalInstructors === 0) return 10; // Default fallback
  
  return Math.ceil(totalStudents / totalInstructors);
};

// Add indexes for better query performance
// Note: account already has a unique index, no need to duplicate
GiangVienSchema.index({ khoa: 1 });
GiangVienSchema.index({ managedStudents: 1 });

export default mongoose.model("GiangVien", GiangVienSchema);
