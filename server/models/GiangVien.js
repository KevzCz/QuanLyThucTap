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
    internshipSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipSubject",
      default: null
    },
    managedStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account"
    }],
    department: {
      type: String,
      trim: true
    },
    maxStudents: {
      type: Number,
      default: 10,
      min: 1,
      max: 20
    }
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

export default mongoose.model("GiangVien", GiangVienSchema);
