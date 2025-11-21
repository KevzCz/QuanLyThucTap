import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import HocKy from "../models/HocKy.js";
import Account from "../models/Account.js";
import SinhVien from "../models/SinhVien.js";
import bcrypt from "bcryptjs";
import { authPDT, authPDTOrBCN, authenticate } from "../middleware/auth.js";

const router = express.Router();

// Configure multer for memory storage (Excel file upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
  },
});

// Helper function to generate username from full name
function generateUsername(fullName) {
  // Remove Vietnamese accents and convert to lowercase
  const name = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  
  const parts = name.split(/\s+/);
  if (parts.length < 2) return name.replace(/\s+/g, "");
  
  // Last name + first letter of each other part
  const lastName = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p[0]).join("");
  return lastName + initials;
}

// Helper function to generate base password (student ID + birthdate)
function generatePassword(studentNumber, birthDate) {
  // birthDate should be in format DD/MM/YYYY
  const dateParts = birthDate.split('/');
  if (dateParts.length === 3) {
    const ddmmyyyy = dateParts[0] + dateParts[1] + dateParts[2]; // DDMMYYYY
    return `SV${studentNumber}${ddmmyyyy}`;
  }
  // Fallback if format is incorrect
  return `SV${studentNumber}${birthDate.replace(/\D/g, '')}`;
}

// POST /api/hocky/import - Import học kỳ from Excel file
router.post("/import", authPDT, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

    if (data.length < 3) {
      return res.status(400).json({ error: "Invalid Excel format: insufficient data" });
    }

    // Parse header row (row 0): Học kỳ X | Năm học X | Duration X - Duration Y
    const headerRow = data[0];
    const hocKyMatch = String(headerRow[0]).match(/Học kỳ\s+(\d+)/i);
    const namHocMatch = String(headerRow[1]).match(/Năm học\s+([\d-]+)/i);
    const durationMatch = String(headerRow[2]).match(/([\d/]+)\s*-\s*([\d/]+)/);

    if (!hocKyMatch || !namHocMatch || !durationMatch) {
      return res.status(400).json({
        error: "Invalid Excel format: missing or incorrect header format",
      });
    }

    const hocKyNumber = parseInt(hocKyMatch[1]);
    const namHoc = namHocMatch[1];
    const durationStart = new Date(durationMatch[1].split("/").reverse().join("-"));
    const durationEnd = new Date(durationMatch[2].split("/").reverse().join("-"));

    // Validate học kỳ number
    if (hocKyNumber < 1 || hocKyNumber > 3) {
      return res.status(400).json({ error: "Học kỳ must be between 1 and 3" });
    }

    // Check if there's already an active học kỳ
    const activeHocKy = await HocKy.findOne({ isActive: true });
    if (activeHocKy) {
      return res.status(400).json({
        error: `Không thể tạo học kỳ mới khi học kỳ ${activeHocKy.hocKyNumber} năm học ${activeHocKy.namHoc} đang hoạt động. Vui lòng kết thúc học kỳ hiện tại trước.`,
      });
    }

    // Check if học kỳ already exists
    const existingHocKy = await HocKy.findOne({ hocKyNumber, namHoc });
    if (existingHocKy) {
      return res.status(400).json({
        error: `Học kỳ ${hocKyNumber} năm học ${namHoc} already exists`,
      });
    }

    // Parse student rows (skip row 0: header, row 1: column headers)
    const studentRows = data.slice(2).filter(row => row[0]); // Filter out empty rows
    
    if (studentRows.length === 0) {
      return res.status(400).json({ error: "No student data found in Excel file" });
    }
    
    // Get all valid khoa from BanChuNhiem
    const BanChuNhiem = (await import("../models/BanChuNhiem.js")).default;
    const validKhoaList = await BanChuNhiem.find().select("khoa").lean();
    const validKhoaNames = new Set(validKhoaList.map(bcn => bcn.khoa.trim()));
    
    console.log("Valid khoa from BanChuNhiem:", Array.from(validKhoaNames));
    
    // Detect if Excel has ID column or not by checking first data row
    let hasIdColumn = false;
    if (studentRows[0] && studentRows[0][0]) {
      const firstCell = String(studentRows[0][0]).trim();
      // Check if first cell looks like an ID (e.g., SV0001) rather than a name
      hasIdColumn = /^SV\d{4}$/i.test(firstCell);
    }
    
    console.log("\n=== Excel Format Detection ===");
    console.log("Has ID Column:", hasIdColumn);
    console.log("First row:", studentRows[0]);
    
    // Check all khoa in the Excel file before processing
    const uniqueKhoa = new Set();
    const invalidKhoa = [];
    
    for (let i = 0; i < studentRows.length; i++) {
      const row = studentRows[i];
      // Adjust column index based on whether ID column exists
      const khoaIndex = hasIdColumn ? 2 : 1;
      const khoa = String(row[khoaIndex] || "").trim();
      if (khoa) {
        uniqueKhoa.add(khoa);
        if (!validKhoaNames.has(khoa)) {
          invalidKhoa.push(khoa);
        }
      }
    }
    
    console.log("Khoa found in Excel:", Array.from(uniqueKhoa));
    console.log("Invalid khoa:", invalidKhoa);
    
    // If there are invalid khoa, return error before creating any records
    if (invalidKhoa.length > 0) {
      const uniqueInvalidKhoa = [...new Set(invalidKhoa)];
      return res.status(400).json({
        error: `Không thể import! Các khoa sau không tồn tại: ${uniqueInvalidKhoa.join(', ')}. Vui lòng tạo Ban Chủ Nhiệm cho các khoa này trước.`,
      });
    }
    
    // If no valid khoa exist in database at all, block the import
    if (validKhoaNames.size === 0) {
      return res.status(400).json({
        error: "Không có khoa nào trong hệ thống. Vui lòng tạo Ban Chủ Nhiệm trước khi import sinh viên.",
      });
    }
    
    // Check if any existing students are in an ACTIVE học kỳ BEFORE processing
    console.log("\n=== Checking for students in active học kỳ ===");
    const activeHocKyForStudentCheck = await HocKy.findOne({ isActive: true }).populate('sinhViens');
    const studentsInActiveHocKy = [];
    
    if (activeHocKyForStudentCheck) {
      console.log(`Found active học kỳ: ${activeHocKyForStudentCheck.hocKyNumber} - ${activeHocKyForStudentCheck.namHoc}`);
      
      for (let i = 0; i < studentRows.length; i++) {
        const row = studentRows[i];
        let excelId, fullName, username;
        
        if (hasIdColumn) {
          excelId = String(row[0] || "").trim();
          fullName = String(row[1] || "").trim();
        } else {
          fullName = String(row[0] || "").trim();
        }
        
        if (!fullName) continue;
        
        // Check if this student exists and is in the active học kỳ
        if (excelId && /^SV\d{4}$/i.test(excelId)) {
          username = excelId.toLowerCase();
        } else {
          // Try to find by name (less reliable but better than nothing)
          const existingAccount = await Account.findOne({ 
            name: fullName, 
            role: "sinh-vien" 
          });
          if (existingAccount) {
            username = existingAccount.username;
          }
        }
        
        if (username) {
          const account = await Account.findOne({ username });
          if (account) {
            const sinhVien = await SinhVien.findOne({ account: account._id });
            if (sinhVien && activeHocKyForStudentCheck.sinhViens) {
              const isInActiveHocKy = activeHocKyForStudentCheck.sinhViens.some(
                sv => sv._id.toString() === sinhVien._id.toString()
              );
              
              if (isInActiveHocKy) {
                studentsInActiveHocKy.push({
                  name: fullName,
                  username: account.username,
                  row: i + 3
                });
              }
            }
          }
        }
      }
    }
    
    // If any students are in active học kỳ, fail the entire import
    if (studentsInActiveHocKy.length > 0) {
      console.log("❌ Found students in active học kỳ:", studentsInActiveHocKy);
      return res.status(400).json({
        error: `Không thể import! ${studentsInActiveHocKy.length} sinh viên đang tham gia học kỳ ${activeHocKyForStudentCheck.hocKyNumber} (${activeHocKyForStudentCheck.namHoc}) chưa kết thúc. Vui lòng kết thúc học kỳ hiện tại trước khi import sinh viên vào học kỳ mới.`,
        details: studentsInActiveHocKy.map(s => `${s.name} (${s.username}) - Dòng ${s.row}`),
      });
    }
    
    console.log("✅ No students in active học kỳ. Proceeding with import...\n");
    
    const createdStudents = [];
    const errors = [];

    // Get the current highest student number to generate sequential IDs
    const lastAccount = await Account.findOne({ role: "sinh-vien" })
      .sort({ username: -1 })
      .select("username")
      .lean();
    
    // Extract number from username like "sv0001" or start from 1
    let currentStudentNumber = 1;
    if (lastAccount && lastAccount.username) {
      const match = lastAccount.username.match(/sv(\d+)/i);
      if (match) {
        currentStudentNumber = parseInt(match[1]) + 1;
      }
    }

    for (let i = 0; i < studentRows.length; i++) {
      const row = studentRows[i];
      
      // Adjust column indices based on whether ID column exists
      let excelId, fullName, khoa, birthDate;
      if (hasIdColumn) {
        excelId = String(row[0] || "").trim();
        fullName = String(row[1] || "").trim();
        khoa = String(row[2] || "").trim();
        birthDate = String(row[3] || "").trim();
      } else {
        excelId = ""; // No ID in Excel, will auto-generate
        fullName = String(row[0] || "").trim();
        khoa = String(row[1] || "").trim();
        birthDate = String(row[2] || "").trim();
      }

      if (!fullName || !khoa || !birthDate) {
        errors.push(`Row ${i + 3}: Missing required fields (name, khoa, or birthdate)`);
        continue;
      }

      try {
        let username, studentNumber, email, password;
        
        // Check if Excel has an ID (e.g., SV0001)
        if (excelId && /^SV\d{4}$/i.test(excelId)) {
          // Use ID from Excel
          username = excelId.toLowerCase();
          const match = username.match(/sv(\d+)/i);
          studentNumber = match ? match[1] : String(currentStudentNumber).padStart(4, '0');
          email = `${username}@gmail.com`;
        } else {
          // Generate sequential student number
          studentNumber = String(currentStudentNumber).padStart(4, '0');
          username = `sv${studentNumber}`;
          email = `${username}@gmail.com`;
          currentStudentNumber++; // Only increment if generating new ID
        }
        
        password = generatePassword(studentNumber, birthDate);
        
        // Log the password before hashing
        console.log(`\n📝 Student: ${fullName} (${username})`);
        console.log(`   Birthdate: ${birthDate}`);
        console.log(`   Password: ${password}`);

        // Check if account already exists by username or ID
        let account = await Account.findOne({ 
          $or: [
            { username: username },
            { id: excelId.toUpperCase() }
          ]
        });
        
        if (!account) {
          console.log(`   ✅ Creating NEW account`);
          
          // Extract birth year from birthDate (DD/MM/YYYY)
          const birthYearFromDate = birthDate.split('/')[2] || new Date().getFullYear();
          
          // Parse birthDate to Date object (DD/MM/YYYY)
          const dateParts = birthDate.split('/');
          let birthDateObj;
          if (dateParts.length === 3) {
            // Convert DD/MM/YYYY to YYYY-MM-DD for Date constructor
            birthDateObj = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          }
          
          // Create new account (password will be hashed by pre-save hook)
          account = new Account({
            username,
            password: password, // Pass plain password, let model hash it
            name: fullName,
            email,
            role: "sinh-vien",
            status: "open",
            khoa,
            year: parseInt(birthYearFromDate), // Birth year from birthdate
          });
          await account.save();

          // Create SinhVien profile
          const sinhVien = new SinhVien({
            account: account._id,
            khoa,
            year: parseInt(namHoc.split("-")[0]), // Academic year
            internshipStatus: "chua-duoc-huong-dan",
          });
          await sinhVien.save();

          // Create Profile with birthdate
          const Profile = (await import("../models/Profile.js")).default;
          const profile = new Profile({
            account: account._id,
            dateOfBirth: birthDateObj,
          });
          await profile.save();

          createdStudents.push({
            accountId: account._id,
            sinhVienId: sinhVien._id,
            username,
            password, // Store plain password for response
            name: fullName,
            email,
          });
        } else {
          console.log(`   ⚠️  Account ALREADY EXISTS - adding to new học kỳ`);
          
          // Update existing account info if needed
          let needsUpdate = false;
          if (account.name !== fullName) {
            account.name = fullName;
            needsUpdate = true;
          }
          if (account.khoa !== khoa) {
            account.khoa = khoa;
            needsUpdate = true;
          }
          if (needsUpdate) {
            // Save without triggering password hash
            await Account.updateOne(
              { _id: account._id },
              { $set: { name: fullName, khoa: khoa } }
            );
          }
          
          // Get or create SinhVien profile
          let sinhVien = await SinhVien.findOne({ account: account._id });
          if (!sinhVien) {
            console.log(`   📝 Creating SinhVien profile for existing account`);
            sinhVien = new SinhVien({
              account: account._id,
              khoa,
              year: parseInt(namHoc.split("-")[0]),
              internshipStatus: "chua-duoc-huong-dan",
            });
            await sinhVien.save();
          } else {
            // Reset internship status for new học kỳ
            console.log(`   🔄 Resetting internship status for new học kỳ`);
            sinhVien.internshipStatus = "chua-duoc-huong-dan";
            sinhVien.supervisor = undefined; // Clear old supervisor
            await sinhVien.save();
          }
          
          // Update/create profile with birthdate
          const Profile = (await import("../models/Profile.js")).default;
          const dateParts = birthDate.split('/');
          let birthDateObj;
          if (dateParts.length === 3) {
            birthDateObj = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          }
          
          let profile = await Profile.findOne({ account: account._id });
          if (!profile && birthDateObj) {
            console.log(`   📝 Creating Profile for existing account`);
            profile = new Profile({
              account: account._id,
              dateOfBirth: birthDateObj,
            });
            await profile.save();
          } else if (profile && birthDateObj && !profile.dateOfBirth) {
            profile.dateOfBirth = birthDateObj;
            await profile.save();
          }
          
          createdStudents.push({
            accountId: account._id,
            sinhVienId: sinhVien._id,
            username: account.username,
            password: null, // Don't show password for existing accounts
            name: fullName,
            email: account.email,
            existing: true,
            retaking: true, // Flag to indicate this is a retake
          });
        }
      } catch (error) {
        errors.push(`Row ${i + 3} (${fullName}): ${error.message}`);
      }
    }

    // Create HocKy record
    const hocKy = new HocKy({
      hocKyNumber,
      namHoc,
      durationStart,
      durationEnd,
      sinhViens: createdStudents.map(s => s.sinhVienId),
      importedBy: req.account._id,
      isActive: true, // Set as active by default since we checked no other active học kỳ exists
    });

    await hocKy.save();

    // Send notifications after successful import
    try {
      const io = req.app.get('io');
      const notificationService = (await import("../services/notificationService.js")).default;
      const GiangVien = (await import("../models/GiangVien.js")).default;
      
      // Group students by khoa
      const studentsByKhoa = new Map();
      for (const student of createdStudents) {
        if (!student.existing) { // Only notify new students
          const sinhVien = await SinhVien.findById(student.sinhVienId).populate('account');
          if (sinhVien) {
            if (!studentsByKhoa.has(sinhVien.khoa)) {
              studentsByKhoa.set(sinhVien.khoa, []);
            }
            studentsByKhoa.get(sinhVien.khoa).push(student);
          }
        }
      }

      // 1. Notify all newly created sinh viên
      for (const student of createdStudents) {
        if (!student.existing && student.accountId) {
          await notificationService.createNotification({
            recipient: student.accountId,
            sender: req.account._id,
            type: 'system',
            title: 'Tài khoản được tạo thành công',
            message: `Chào mừng bạn đến với Học kỳ ${hocKyNumber} - Năm học ${namHoc}. Tài khoản của bạn đã được tạo. Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.`,
            link: '/profile',
            priority: 'high',
            metadata: {
              hocKyId: hocKy._id.toString(),
              hocKyNumber,
              namHoc
            }
          }, io);
        }
      }

      // 2. Notify BCN and GV for each khoa
      for (const [khoa, students] of studentsByKhoa.entries()) {
        // Notify BCN
        const bcn = await BanChuNhiem.findOne({ khoa }).populate('account');
        if (bcn && bcn.account) {
          await notificationService.createNotification({
            recipient: bcn.account._id,
            sender: req.account._id,
            type: 'system',
            title: `Học kỳ ${hocKyNumber} - Năm học ${namHoc} đã được tạo`,
            message: `${students.length} sinh viên mới từ khoa ${khoa} đã được thêm vào Học kỳ ${hocKyNumber} - Năm học ${namHoc}.`,
            link: `/hocky/${hocKy._id}`,
            priority: 'high',
            metadata: {
              hocKyId: hocKy._id.toString(),
              hocKyNumber,
              namHoc,
              khoa,
              studentCount: students.length
            }
          }, io);
        }

        // Notify all GV in this khoa
        const giangVienList = await GiangVien.find({ khoa }).populate('account');
        for (const gv of giangVienList) {
          if (gv.account) {
            await notificationService.createNotification({
              recipient: gv.account._id,
              sender: req.account._id,
              type: 'system',
              title: `Học kỳ ${hocKyNumber} - Năm học ${namHoc} đã được tạo`,
              message: `${students.length} sinh viên mới từ khoa ${khoa} đã được thêm vào Học kỳ ${hocKyNumber} - Năm học ${namHoc}.`,
              link: `/hocky/${hocKy._id}`,
              priority: 'medium',
              metadata: {
                hocKyId: hocKy._id.toString(),
                hocKyNumber,
                namHoc,
                khoa,
                studentCount: students.length
              }
            }, io);
          }
        }
      }
    } catch (notifError) {
      console.error('Error sending học kỳ import notifications:', notifError);
      // Don't fail the import if notifications fail
    }

    res.status(201).json({
      message: "Học kỳ imported successfully",
      hocKy: {
        id: hocKy._id,
        hocKyNumber: hocKy.hocKyNumber,
        namHoc: hocKy.namHoc,
        durationStart: hocKy.durationStart,
        durationEnd: hocKy.durationEnd,
        studentCount: createdStudents.length,
      },
      students: createdStudents,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing học kỳ:", error);
    res.status(500).json({ error: error.message || "Failed to import học kỳ" });
  }
});

// GET /api/hocky - List all học kỳ with optional filters
router.get("/", authPDTOrBCN, async (req, res) => {
  try {
    const { namHoc, limit } = req.query;
    const query = {};
    
    if (namHoc) {
      query.namHoc = namHoc;
    }

    let queryBuilder = HocKy.find(query)
      .populate({
        path: "sinhViens",
        populate: {
          path: "account",
          select: "name username",
        },
      })
      .sort({ namHoc: -1, hocKyNumber: 1 });

    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit, 10));
    }

    const hocKyList = await queryBuilder;

    res.json({ success: true, data: hocKyList });
  } catch (error) {
    console.error("Error fetching học kỳ:", error);
    res.status(500).json({ error: "Failed to fetch học kỳ list" });
  }
});

// GET /api/hocky/list - List all học kỳ (basic info, accessible by all authenticated users)
router.get("/list", authenticate, async (req, res) => {
  try {
    const { namHoc, limit } = req.query;
    const query = {};
    
    if (namHoc) {
      query.namHoc = namHoc;
    }

    let queryBuilder = HocKy.find(query)
      .select('hocKyNumber namHoc durationStart durationEnd isActive createdAt')
      .sort({ namHoc: -1, hocKyNumber: -1 });

    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit, 10));
    }

    const hocKyList = await queryBuilder;

    // Format response to match expected structure and count valid students
    const formattedList = await Promise.all(hocKyList.map(async (hk) => {
      // Count only existing SinhVien records
      const studentCount = await SinhVien.countDocuments({ _id: { $in: hk.sinhViens } });
      
      return {
        id: hk._id.toString(),
        hocKyNumber: hk.hocKyNumber,
        namHoc: hk.namHoc,
        durationStart: hk.durationStart,
        durationEnd: hk.durationEnd,
        isActive: hk.isActive,
        studentCount: studentCount,
        createdAt: hk.createdAt
      };
    }));

    res.json(formattedList);
  } catch (error) {
    console.error("Error fetching học kỳ list:", error);
    res.status(500).json({ error: "Failed to fetch học kỳ list" });
  }
});

// GET /api/hocky/nam-hoc - Get list of distinct năm học values
router.get("/nam-hoc", authPDT, async (req, res) => {
  try {
    const namHocList = await HocKy.distinct("namHoc");
    res.json(namHocList.sort().reverse());
  } catch (error) {
    console.error("Error fetching năm học list:", error);
    res.status(500).json({ error: "Failed to fetch năm học list" });
  }
});

// GET /api/hocky/:id - Get học kỳ details
router.get("/:id", authPDT, async (req, res) => {
  try {
    const hocKy = await HocKy.findById(req.params.id)
      .populate({
        path: "sinhViens",
        populate: {
          path: "account",
          select: "name username email khoa",
        },
      })
      .populate("importedBy", "name username");

    if (!hocKy) {
      return res.status(404).json({ error: "Học kỳ not found" });
    }

    // Filter out deleted students (where sinhVien or account is null)
    const validStudents = hocKy.sinhViens.filter(sv => sv && sv.account);
    
    // Create clean response with only valid students
    const response = {
      _id: hocKy._id,
      hocKyNumber: hocKy.hocKyNumber,
      namHoc: hocKy.namHoc,
      durationStart: hocKy.durationStart,
      durationEnd: hocKy.durationEnd,
      isActive: hocKy.isActive,
      sinhViens: validStudents,
      importedBy: hocKy.importedBy,
      importDate: hocKy.importDate,
      createdAt: hocKy.createdAt,
      updatedAt: hocKy.updatedAt
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching học kỳ:", error);
    res.status(500).json({ error: "Failed to fetch học kỳ details" });
  }
});

// PUT /api/hocky/:id - Update học kỳ
router.put("/:id", authPDT, async (req, res) => {
  try {
    const { hocKyNumber, namHoc, durationStart, durationEnd } = req.body;

    const hocKy = await HocKy.findById(req.params.id);
    if (!hocKy) {
      return res.status(404).json({ error: "Học kỳ not found" });
    }

    // Update fields if provided
    if (hocKyNumber !== undefined) hocKy.hocKyNumber = hocKyNumber;
    if (namHoc !== undefined) hocKy.namHoc = namHoc;
    if (durationStart !== undefined) hocKy.durationStart = new Date(durationStart);
    if (durationEnd !== undefined) hocKy.durationEnd = new Date(durationEnd);

    await hocKy.save();

    res.json({
      message: "Học kỳ updated successfully",
      hocKy,
    });
  } catch (error) {
    console.error("Error updating học kỳ:", error);
    res.status(500).json({ error: error.message || "Failed to update học kỳ" });
  }
});

// DELETE /api/hocky/:id - Delete học kỳ
router.delete("/:id", authPDT, async (req, res) => {
  try {
    const hocKy = await HocKy.findById(req.params.id);
    if (!hocKy) {
      return res.status(404).json({ error: "Học kỳ not found" });
    }

    await hocKy.deleteOne();

    res.json({
      message: "Học kỳ deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting học kỳ:", error);
    res.status(500).json({ error: error.message || "Failed to delete học kỳ" });
  }
});

// PATCH /api/hocky/:id/toggle-status - Toggle học kỳ active status
router.patch("/:id/toggle-status", authPDT, async (req, res) => {
  try {
    const hocKy = await HocKy.findById(req.params.id);
    if (!hocKy) {
      return res.status(404).json({ error: "Học kỳ not found" });
    }

    // If activating this học kỳ, deactivate all others
    if (!hocKy.isActive) {
      await HocKy.updateMany({ _id: { $ne: hocKy._id } }, { isActive: false });
    }

    hocKy.isActive = !hocKy.isActive;
    await hocKy.save();

    res.json({
      success: true,
      message: hocKy.isActive ? "Học kỳ đã được kích hoạt" : "Học kỳ đã được kết thúc",
      hocKy: hocKy,
    });
  } catch (error) {
    console.error("Error toggling học kỳ status:", error);
    res.status(500).json({ error: error.message || "Failed to toggle học kỳ status" });
  }
});

export default router;
