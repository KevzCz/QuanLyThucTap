import express from 'express';
import Profile from '../models/Profile.js';
import Account from '../models/Account.js';
import BanChuNhiem from '../models/BanChuNhiem.js';
import GiangVien from '../models/GiangVien.js';
import SinhVien from '../models/SinhVien.js';
import { authenticate, authorize } from '../middleware/auth.js';
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

// Get BCN's khoa information (replaces internship-subjects/bcn/managed)
router.get('/bcn/khoa-info', authenticate, authorize(['ban-chu-nhiem']), async (req, res) => {
  try {
    // Find BCN profile
    const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id });
    if (!bcnProfile) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin ban chủ nhiệm' });
    }

    const khoaName = bcnProfile.khoa;

    // Find all lecturers in this khoa
    const lecturers = await GiangVien.find({ khoa: khoaName })
      .populate('account', 'id name email')
      .populate('managedStudents', 'id name email') // managedStudents are Account refs
      .lean();

    // Find all students in this khoa
    const students = await SinhVien.find({ khoa: khoaName })
      .populate('account', 'id name email')
      .lean();

    // Format the response to match InternshipSubjectDetail structure
    const khoaInfo = {
      id: khoaName, // Use khoa name as ID
      title: `Khoa ${khoaName}`,
      maxStudents: students.length,
      manager: {
        id: req.account.id || req.account._id.toString(),
        name: req.account.name,
        email: req.account.email
      },
      status: 'open',
      lecturers: lecturers.map(lecturer => ({
        id: lecturer.account?.id || lecturer.account?._id?.toString() || lecturer._id.toString(),
        name: lecturer.account?.name || 'Unknown',
        email: lecturer.account?.email || '',
        maxStudents: lecturer.maxStudents,
        managedStudents: (lecturer.managedStudents || []).map(studentAccount => ({
          id: studentAccount.id || studentAccount._id?.toString(),
          name: studentAccount.name || 'Unknown',
          email: studentAccount.email || ''
        }))
      })),
      students: students.map(student => ({
        id: student.account?.id || student.account?._id?.toString() || student._id.toString(),
        name: student.account?.name || 'Unknown',
        email: student.account?.email || ''
      })),
      currentStudents: students.length,
      createdAt: bcnProfile.createdAt || new Date().toISOString(),
      updatedAt: bcnProfile.updatedAt || new Date().toISOString()
    };

    res.json({
      success: true,
      khoa: khoaInfo
    });
  } catch (error) {
    console.error('Error fetching BCN khoa info:', error);
    res.status(500).json({ error: 'Failed to fetch khoa information' });
  }
});

// Get student profile with khoa and instructor info
router.get('/student/info', authenticate, authorize(['sinh-vien']), async (req, res) => {
  try {
    const sinhVien = await SinhVien.findOne({ account: req.account._id }).lean();

    if (!sinhVien) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const response = {
      student: {
        id: req.account.id || req.account._id.toString(),
        khoa: sinhVien.khoa
      }
    };

    // Include instructor info if assigned
    if (sinhVien.supervisor) {
      // supervisor is an Account ID, not GiangVien ID
      const supervisorAccount = await Account.findById(sinhVien.supervisor).lean();
      if (supervisorAccount) {
        response.instructor = {
          id: supervisorAccount.id || supervisorAccount._id.toString(),
          name: supervisorAccount.name,
          email: supervisorAccount.email
        };
        response.subject = {
          id: sinhVien.khoa,
          title: `Khoa ${sinhVien.khoa}`
        };
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching student info:', error);
    res.status(500).json({ error: 'Failed to fetch student information' });
  }
});

export default router;
