import express from 'express';
import Profile from '../models/Profile.js';
import Account from '../models/Account.js';
import { authenticate } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get current user's profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const accountId = req.account._id;
    
    // Get account details
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get or create profile
    let profile = await Profile.findOne({ account: accountId });
    if (!profile) {
      profile = new Profile({ account: accountId });
      await profile.save();
    }

    res.json({
      profile: {
        ...profile.toJSON(),
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role
        }
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update current user's profile
router.put('/me', authenticate, async (req, res) => {
  try {
    const accountId = req.account._id;
    const { name, email, phone, personalEmail, address, dateOfBirth, avatar, bio, currentPassword, newPassword } = req.body;

    // Get account
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Update account fields if provided
    if (name && name.trim()) {
      account.name = name.trim();
    }
    
    if (email && email.trim()) {
      const emailLower = email.trim().toLowerCase();
      // Check if email already exists for another user
      const existingAccount = await Account.findOne({ 
        email: emailLower, 
        _id: { $ne: accountId } 
      });
      
      if (existingAccount) {
        return res.status(400).json({ error: 'Email đã được sử dụng bởi tài khoản khác' });
      }
      
      account.email = emailLower;
    }

    // Handle password change
    if (newPassword && currentPassword) {
      const isMatch = await account.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      }
      
      account.password = newPassword; // Will be hashed by pre-save hook
    }

    await account.save();

    // Get or create profile
    let profile = await Profile.findOne({ account: accountId });
    if (!profile) {
      profile = new Profile({ account: accountId });
    }

    // Update profile fields
    if (phone !== undefined) profile.phone = phone;
    if (personalEmail !== undefined) profile.personalEmail = personalEmail;
    if (address !== undefined) profile.address = address;
    if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth;
    if (avatar !== undefined) profile.avatar = avatar;
    if (bio !== undefined) profile.bio = bio;

    await profile.save();

    res.json({
      message: 'Cập nhật thông tin thành công',
      profile: {
        ...profile.toJSON(),
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role
        }
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
