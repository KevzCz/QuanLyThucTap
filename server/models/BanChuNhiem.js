import mongoose from "mongoose";

const BanChuNhiemSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
      validate: {
        validator: async function(v) {
          const account = await mongoose.model("Account").findById(v);
          return account && account.role === "ban-chu-nhiem";
        },
        message: "Account must be ban-chu-nhiem role"
      }
    },
    internshipSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipSubject",
      default: null
    },
    department: {
      type: String,
      trim: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for account details
BanChuNhiemSchema.virtual('accountDetails', {
  ref: 'Account',
  localField: 'account',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model("BanChuNhiem", BanChuNhiemSchema);
