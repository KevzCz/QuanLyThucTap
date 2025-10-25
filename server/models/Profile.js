import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty
          return /^[0-9]{10,11}$/.test(v);
        },
        message: 'Số điện thoại phải có 10-11 chữ số'
      }
    },
    personalEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email cá nhân không hợp lệ'
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200
    },
    dateOfBirth: {
      type: Date
    },
    avatar: {
      type: String, // URL to avatar image
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for account details
ProfileSchema.virtual('accountDetails', {
  ref: 'Account',
  localField: 'account',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model("Profile", ProfileSchema);
