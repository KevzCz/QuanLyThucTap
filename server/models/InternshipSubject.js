import mongoose from "mongoose";

const InternshipSubjectSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      default: ""
    },
    duration: {
      type: String,
      required: true,
      default: "8 tuần"
    },
    registrationStartDate: {
      type: Date,
      required: true
    },
    registrationEndDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return !this.registrationStartDate || v > this.registrationStartDate;
        },
        message: "Ngày kết thúc đăng ký phải sau ngày bắt đầu đăng ký"
      }
    },
    maxStudents: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 50,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      validate: {
        validator: async function(v) {
          const account = await mongoose.model("Account").findById(v);
          return account && account.role === "ban-chu-nhiem";
        },
        message: "Manager must be a ban-chu-nhiem"
      }
    },
    status: {
      type: String,
      required: true,
      enum: ["open", "locked"],
      default: "open"
    },
    lecturers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account"
    }],
    students: [{
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

// Generate ID before validation
InternshipSubjectSchema.pre('validate', async function (next) {
  try {
    if (this.id && this.id !== '') return next();

    const prefix = 'TT';
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

    this.id = `${prefix}${currentYear}${String(nextNumber).padStart(3, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

// Set default dates if not provided
InternshipSubjectSchema.pre('validate', function(next) {
  const now = new Date();
  
  // Set default registration period (2 weeks from now to 1 month from now)
  if (!this.registrationStartDate) {
    this.registrationStartDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  if (!this.registrationEndDate) {
    this.registrationEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Ensure manager is unique across active subjects
InternshipSubjectSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('manager')) return next();
    
    const existing = await this.constructor.findOne({
      manager: this.manager,
      status: 'open',
      _id: { $ne: this._id }
    });
    
    if (existing) {
      return next(new Error('Ban chủ nhiệm này đã quản lý một môn thực tập khác'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for current student count
InternshipSubjectSchema.virtual('currentStudents').get(function() {
  return this.students ? this.students.length : 0;
});

// Virtual for registration status
InternshipSubjectSchema.virtual('registrationStatus').get(function() {
  const now = new Date();
  const regStart = new Date(this.registrationStartDate);
  const regEnd = new Date(this.registrationEndDate);
  
  if (now < regStart) return 'not-started';
  if (now > regEnd) return 'ended';
  if (this.currentStudents >= this.maxStudents) return 'full';
  return 'open';
});

export default mongoose.model("InternshipSubject", InternshipSubjectSchema);

 