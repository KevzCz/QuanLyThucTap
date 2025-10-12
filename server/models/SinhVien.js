import mongoose from "mongoose";

const SinhVienSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
      validate: {
        validator: async function(v) {
          const account = await mongoose.model("Account").findById(v);
          return account && account.role === "sinh-vien";
        },
        message: "Account must be sinh-vien role"
      }
    },
    internshipSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipSubject",
      default: null
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      validate: {
        validator: async function(v) {
          if (!v) return true; // Allow null
          const account = await mongoose.model("Account").findById(v);
          return account && account.role === "giang-vien";
        },
        message: "Supervisor must be giang-vien role"
      }
    },
    internshipStatus: {
      type: String,
      enum: ["duoc-huong-dan", "chua-duoc-huong-dan", "dang-lam-do-an", "dang-thuc-tap"],
      default: "chua-duoc-huong-dan"
    },
    studentClass: {
      type: String,
      trim: true
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear()
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for account details
SinhVienSchema.virtual('accountDetails', {
  ref: 'Account',
  localField: 'account',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model("SinhVien", SinhVienSchema);
