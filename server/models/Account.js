import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const AccountSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          // Only allow letters, spaces, and Vietnamese characters
          return /^[a-zA-ZÀ-ỹ\s]+$/.test(v);
        },
        message: 'Tên chỉ được chứa chữ cái và khoảng trắng'
      }
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email không hợp lệ'
      }
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      required: true,
      enum: ["phong-dao-tao", "ban-chu-nhiem", "giang-vien", "sinh-vien"]
    },
    status: {
      type: String,
      required: true,
      enum: ["open", "locked"],
      default: "open"
    }
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hash password before saving
AccountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate ID based on role before validation so "required" passes
AccountSchema.pre('validate', async function (next) {
  try {
    // if an id is already set (e.g., import), keep it
    if (this.id && this.id !== '') return next();

    const prefixes = {
      'phong-dao-tao': 'PDT',
      'ban-chu-nhiem': 'BCN',
      'giang-vien': 'GV',
      'sinh-vien': 'SV',
    };

    const prefix = prefixes[this.role];
    if (!prefix) return next(new Error('Không thể xác định prefix cho role'));

    const digitCount = this.role === 'giang-vien' || this.role === 'sinh-vien' ? 4 : 3;

    // find latest id for this prefix
    const latest = await this.constructor
      .findOne({ id: new RegExp(`^${prefix}`) })
      .sort({ id: -1 })
      .lean();

    let nextNumber = 1;
    if (latest?.id) {
      const n = parseInt(String(latest.id).replace(prefix, ''), 10);
      if (!Number.isNaN(n)) nextNumber = n + 1;
    }

    this.id = `${prefix}${String(nextNumber).padStart(digitCount, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

// keep the password hashing pre('save') as-is below…


// Instance method to compare password
AccountSchema.methods.comparePassword = async function(candidatePassword) {
  // Check if password is already hashed (starts with $2a$ or $2b$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    // Password is hashed, use bcrypt compare
    return bcrypt.compare(candidatePassword, this.password);
  } else {
    // Password is plain text (legacy data), compare directly
    console.log('Comparing plain text password');
    const isMatch = candidatePassword === this.password;
    
    // If match and password is plain text, hash it for future use
    if (isMatch) {
      console.log('Plain text password matched, hashing for future use...');
      this.password = candidatePassword; // This will trigger the pre-save hook to hash it
      await this.save();
    }
    
    return isMatch;
  }
};

// Static method to find by credentials
AccountSchema.statics.findByCredentials = async function(email, password) {
  console.log('Finding account with email:', email);
  
  // Debug: List all accounts to see what's in the database
  const allAccounts = await this.find({}, 'id email status');
  console.log('All accounts in database:', allAccounts);
  
  const account = await this.findOne({ email: email.toLowerCase() });
  console.log('Found account:', account ? { id: account.id, email: account.email, status: account.status } : 'null');
  
  if (!account) {
    throw new Error('Email không tồn tại trong hệ thống');
  }
  
  if (account.status !== "open") {
    throw new Error('Tài khoản đã bị khóa');
  }
  
  const isMatch = await account.comparePassword(password);
  console.log('Password match:', isMatch);
  
  if (!isMatch) {
    throw new Error('Mật khẩu không chính xác');
  }
  
  return account;
};

export default mongoose.model("Account", AccountSchema);
