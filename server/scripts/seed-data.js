import mongoose from 'mongoose';
import Account from '../models/Account.js';
import SinhVien from '../models/SinhVien.js';
import GiangVien from '../models/GiangVien.js';
import BanChuNhiem from '../models/BanChuNhiem.js';
import InternshipSubject from '../models/InternshipSubject.js';
import PageHeader from '../models/PageHeader.js';
import SubHeader from '../models/SubHeader.js';
import Report from '../models/Report.js';
import InternshipGrade from '../models/InternshipGrade.js';
import ChatRequest from '../models/ChatRequest.js';
import ChatConversation from '../models/ChatConversation.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/QLTT';

// Sample data generators
const vietnameseNames = {
  firstNames: ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'],
  middleNames: ['Văn', 'Thị', 'Hữu', 'Minh', 'Anh', 'Quốc', 'Đức', 'Thanh', 'Phương', 'Khánh'],
  lastNames: ['Hùng', 'Linh', 'An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Khoa', 'Long', 'Mai', 'Nam', 'Phương', 'Quân', 'Thảo', 'Tú', 'Vy']
};

function generateName() {
  const first = vietnameseNames.firstNames[Math.floor(Math.random() * vietnameseNames.firstNames.length)];
  const middle = vietnameseNames.middleNames[Math.floor(Math.random() * vietnameseNames.middleNames.length)];
  const last = vietnameseNames.lastNames[Math.floor(Math.random() * vietnameseNames.lastNames.length)];
  return `${first} ${middle} ${last}`;
}

function generateEmail(name, role, index) {
  const roleMap = {
    'phong-dao-tao': 'pdt',
    'ban-chu-nhiem': 'bcn',
    'giang-vien': 'gv',
    'sinh-vien': 'sv'
  };
  
  const rolePrefix = roleMap[role] || role;
  const paddedIndex = String(index).padStart(role === 'giang-vien' || role === 'sinh-vien' ? 4 : 3, '0');
  return `${rolePrefix}${paddedIndex}@gmail.com`;
}

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await Account.deleteMany({});
    await SinhVien.deleteMany({});
    await GiangVien.deleteMany({});
    await BanChuNhiem.deleteMany({});
    await InternshipSubject.deleteMany({});
    await PageHeader.deleteMany({});
    await SubHeader.deleteMany({});
    await Report.deleteMany({});
    await InternshipGrade.deleteMany({});
    await ChatRequest.deleteMany({});
    await ChatConversation.deleteMany({});
    console.log('✅ Cleared all collections');

    // Create PDT accounts
    console.log('\n👤 Creating Phòng Đào Tạo accounts...');
    const pdtAccounts = [];
    for (let i = 1; i <= 5; i++) {
      const name = generateName();
      const account = await Account.create({
        name,
        email: generateEmail(name, 'phong-dao-tao', i),
        password: '123456',
        role: 'phong-dao-tao',
        status: 'open'
      });
      pdtAccounts.push(account);
      console.log(`  ✓ ${account.id} - ${account.name}`);
    }

    // Create BCN accounts
    console.log('\n👤 Creating Ban Chủ Nhiệm accounts...');
    const bcnAccounts = [];
    for (let i = 1; i <= 5; i++) {
      const name = generateName();
      const account = await Account.create({
        name,
        email: generateEmail(name, 'ban-chu-nhiem', i),
        password: '123456',
        role: 'ban-chu-nhiem',
        status: 'open'
      });
      bcnAccounts.push(account);
      
      await BanChuNhiem.create({
        account: account._id,
        department: i <= 2 ? 'Công nghệ thông tin' : i <= 4 ? 'Kinh tế' : 'Kỹ thuật'
      });
      
      console.log(`  ✓ ${account.id} - ${account.name}`);
    }

    // Create GV accounts
    console.log('\n👤 Creating Giảng Viên accounts...');
    const gvAccounts = [];
    for (let i = 1; i <= 5; i++) {
      const name = generateName();
      const account = await Account.create({
        name,
        email: generateEmail(name, 'giang-vien', i),
        password: '123456',
        role: 'giang-vien',
        status: 'open'
      });
      gvAccounts.push(account);
      
      await GiangVien.create({
        account: account._id,
        department: i <= 2 ? 'Công nghệ thông tin' : i <= 4 ? 'Kinh tế' : 'Kỹ thuật',
        maxStudents: 5 + Math.floor(Math.random() * 6) // 5-10 students
      });
      
      console.log(`  ✓ ${account.id} - ${account.name}`);
    }

    // Create SV accounts
    console.log('\n👤 Creating Sinh Viên accounts...');
    const svAccounts = [];
    for (let i = 1; i <= 5; i++) {
      const name = generateName();
      const account = await Account.create({
        name,
        email: generateEmail(name, 'sinh-vien', i),
        password: '123456',
        role: 'sinh-vien',
        status: 'open'
      });
      svAccounts.push(account);
      
      await SinhVien.create({
        account: account._id,
        internshipStatus: 'chua-duoc-huong-dan',
        studentClass: `DHKTPM${15 + Math.floor(Math.random() * 3)}A`,
        year: 2024 + Math.floor(Math.random() * 2)
      });
      
      console.log(`  ✓ ${account.id} - ${account.name}`);
    }

    // Create Internship Subjects
    console.log('\n📚 Creating Internship Subjects...');
    const subjects = [];
    const subjectTemplates = [
      { title: 'Thực tập tốt nghiệp CNTT', duration: '8 tuần', maxStudents: 30 },
      { title: 'Thực tập doanh nghiệp Kinh tế', duration: '10 tuần', maxStudents: 25 },
      { title: 'Thực tập kỹ thuật phần mềm', duration: '12 tuần', maxStudents: 20 },
      { title: 'Thực tập Khoa học dữ liệu', duration: '8 tuần', maxStudents: 15 },
      { title: 'Thực tập An toàn thông tin', duration: '10 tuần', maxStudents: 20 }
    ];

    for (let i = 0; i < 5; i++) {
      const template = subjectTemplates[i];
      const now = new Date();
      const regStart = new Date(now.getTime() + (i - 2) * 7 * 24 * 60 * 60 * 1000); // Stagger start dates
      const regEnd = new Date(regStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subject = await InternshipSubject.create({
        title: template.title,
        description: `Môn thực tập ${template.title.toLowerCase()} dành cho sinh viên năm cuối`,
        duration: template.duration,
        maxStudents: template.maxStudents,
        registrationStartDate: regStart,
        registrationEndDate: regEnd,
        manager: bcnAccounts[i]._id,
        status: 'open',
        lecturers: [gvAccounts[i % gvAccounts.length]._id],
        students: i < svAccounts.length ? [svAccounts[i]._id] : []
      });
      subjects.push(subject);
      console.log(`  ✓ ${subject.id} - ${subject.title}`);
    }

    // Update SinhVien and GiangVien with subject relationships
    for (let i = 0; i < Math.min(5, svAccounts.length); i++) {
      await SinhVien.findOneAndUpdate(
        { account: svAccounts[i]._id },
        { 
          internshipSubject: subjects[i]._id,
          supervisor: gvAccounts[i % gvAccounts.length]._id,
          internshipStatus: 'duoc-huong-dan'
        }
      );
    }

    for (let i = 0; i < gvAccounts.length; i++) {
      const studentIds = svAccounts
        .slice(i, i + 1)
        .map(acc => acc._id);
      
      await GiangVien.findOneAndUpdate(
        { account: gvAccounts[i]._id },
        { 
          internshipSubject: subjects[i % subjects.length]._id,
          managedStudents: studentIds
        }
      );
    }

    // Update BCN with subject relationships
    for (let i = 0; i < bcnAccounts.length; i++) {
      await BanChuNhiem.findOneAndUpdate(
        { account: bcnAccounts[i]._id },
        { internshipSubject: subjects[i]._id }
      );
    }

    // Create Page Headers and Sub Headers (Khoa Pages)
    console.log('\n📄 Creating Page Headers and Sub Headers...');
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      
      // Khoa page headers
      const headerTemplates = [
        { title: 'Thông báo chung', order: 1 },
        { title: 'Tài liệu hướng dẫn', order: 2 },
        { title: 'Biểu mẫu', order: 3 }
      ];

      for (const template of headerTemplates) {
        const header = await PageHeader.create({
          internshipSubject: subject._id,
          title: template.title,
          order: template.order,
          audience: 'tat-ca',
          pageType: 'khoa',
          isActive: true
        });

        // Create sub-headers for each header
        const subTemplates = [
          { title: 'Thông báo 1', kind: 'thong-bao', order: 1 },
          { title: 'Nộp báo cáo', kind: 'nop-file', order: 2 }
        ];

        for (const subTemplate of subTemplates) {
          const now = new Date();
          await SubHeader.create({
            pageHeader: header._id,
            title: subTemplate.title,
            html: `<p>Nội dung ${subTemplate.title} cho ${header.title}</p>`,
            kind: subTemplate.kind,
            order: subTemplate.order,
            startAt: subTemplate.kind === 'nop-file' ? now.toISOString() : undefined,
            endAt: subTemplate.kind === 'nop-file' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined
          });
        }
      }

      // Teacher page headers for first lecturer
      if (subject.lecturers.length > 0) {
        const gv = await GiangVien.findOne({ account: subject.lecturers[0] });
        const teacherHeaderTemplates = [
          { title: 'Hướng dẫn cho sinh viên', order: 1 },
          { title: 'Nộp bài tập', order: 2 }
        ];

        for (const template of teacherHeaderTemplates) {
          const header = await PageHeader.create({
            internshipSubject: subject._id,
            instructor: gv._id,
            title: template.title,
            order: template.order,
            audience: 'sinh-vien',
            pageType: 'teacher',
            isActive: true
          });

          // Create sub-headers
          const now = new Date();
          await SubHeader.create({
            pageHeader: header._id,
            title: 'Nội dung hướng dẫn',
            html: '<p>Hướng dẫn chi tiết cho sinh viên</p>',
            kind: 'thuong',
            order: 1
          });
        }
      }

      console.log(`  ✓ Created pages for ${subject.title}`);
    }

    // Create Reports
    console.log('\n📝 Creating Reports...');
    const reportTypes = ['tuan', 'thang', 'quy', 'nam', 'khac'];
    const reportStatuses = ['draft', 'submitted', 'reviewed', 'approved'];
    
    for (let i = 0; i < 5; i++) {
      const report = await Report.create({
        title: `Báo cáo ${reportTypes[i]} - Kỳ ${i + 1}`,
        content: `<h2>Báo cáo tiến độ thực tập</h2><p>Nội dung báo cáo chi tiết về quá trình thực tập...</p>`,
        reportType: reportTypes[i],
        status: reportStatuses[i % reportStatuses.length],
        instructor: gvAccounts[i % gvAccounts.length]._id,
        internshipSubject: subjects[i % subjects.length]._id,
        submittedAt: i > 0 ? new Date() : null,
        reviewedAt: i > 1 ? new Date() : null,
        reviewNote: i > 1 ? 'Báo cáo tốt, cần bổ sung thêm thông tin' : '',
        attachments: []
      });
      console.log(`  ✓ ${report.id} - ${report.title}`);
    }

    // Create Internship Grades
    console.log('\n📊 Creating Internship Grades...');
    for (let i = 0; i < Math.min(5, svAccounts.length); i++) {
      const now = new Date();
      const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      const grade = await InternshipGrade.create({
        student: svAccounts[i]._id,
        supervisor: gvAccounts[i % gvAccounts.length]._id,
        internshipSubject: subjects[i % subjects.length]._id,
        workType: i % 2 === 0 ? 'thuc_tap' : 'do_an',
        startDate: startDate,
        endDate: endDate,
        company: i % 2 === 0 ? {
          name: `Công ty Công nghệ ${i + 1}`,
          supervisorName: `Nguyễn Văn ${String.fromCharCode(65 + i)}`,
          supervisorEmail: `supervisor${i + 1}@company.com`,
          supervisorPhone: `090000000${i}`,
          address: `${i + 1} Đường ABC, Quận ${i + 1}, TP.HCM`
        } : undefined,
        gradeComponents: [
          {
            type: 'supervisor_score',
            score: 7.0 + Math.random() * 2,
            weight: 0.7,
            comment: 'Điểm đánh giá từ giảng viên hướng dẫn',
            gradedBy: 'supervisor'
          },
          {
            type: 'company_score',
            score: 7.5 + Math.random() * 2,
            weight: 0.3,
            comment: i % 2 === 0 ? 'Điểm đánh giá từ công ty' : '',
            gradedBy: 'company'
          }
        ],
        milestones: [
          {
            type: 'start',
            title: i % 2 === 0 ? 'Bắt đầu thực tập' : 'Bắt đầu đồ án',
            description: i % 2 === 0 ? 'Khởi tạo quá trình thực tập tại doanh nghiệp' : 'Khởi tạo dự án đồ án tốt nghiệp',
            dueDate: startDate,
            status: 'completed',
            completedAt: startDate,
            isCustom: false
          }
        ],
        status: i < 2 ? 'submitted' : i < 4 ? 'in_progress' : 'not_started',
        submittedToBCN: i < 2,
        submittedAt: i < 2 ? new Date() : undefined,
        supervisorFinalComment: 'Sinh viên chăm chỉ, nhiệt tình trong quá trình thực tập'
      });
      
      // Calculate final grade
      grade.calculateFinalGrade();
      await grade.save();
      
      console.log(`  ✓ Grade for ${svAccounts[i].name} - Final: ${grade.finalGrade?.toFixed(2)}`);
    }

    // Create Chat Requests
    console.log('\n💬 Creating Chat Requests...');
    for (let i = 0; i < 5; i++) {
      const requester = svAccounts[i % svAccounts.length];
      const recipient = gvAccounts[i % gvAccounts.length];
      const requestId = `CR${Date.now()}${i}`;
      
      const request = await ChatRequest.create({
        requestId: requestId,
        fromUser: {
          userId: requester._id.toString(),
          name: requester.name,
          role: requester.role,
          email: requester.email
        },
        toUser: {
          userId: recipient._id.toString(),
          name: recipient.name,
          role: recipient.role,
          email: recipient.email
        },
        message: `Xin chào thầy/cô, em muốn trao đổi về vấn đề thực tập`,
        requestType: 'chat',
        priority: i === 0 ? 'high' : 'normal',
        status: i < 2 ? 'accepted' : i < 4 ? 'pending' : 'declined'
      });
      console.log(`  ✓ Chat request ${i + 1}`);

      // Create conversation if accepted
      if (i < 2) {
        const conversationId = `CONV${Date.now()}${i}`;
        await ChatConversation.create({
          conversationId: conversationId,
          participants: [
            {
              userId: requester._id.toString(),
              name: requester.name,
              role: requester.role
            },
            {
              userId: recipient._id.toString(),
              name: recipient.name,
              role: recipient.role
            }
          ],
          conversationType: 'direct',
          createdBy: requester._id.toString(),
          isActive: true,
          lastMessage: {
            content: 'Xin chào thầy/cô',
            senderId: requester._id.toString(),
            senderName: requester.name,
            timestamp: new Date(),
            type: 'text'
          },
          metadata: {
            requestId: request.requestId
          }
        });
        console.log(`  ✓ Created conversation for request ${i + 1}`);
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  • ${pdtAccounts.length} Phòng Đào Tạo accounts`);
    console.log(`  • ${bcnAccounts.length} Ban Chủ Nhiệm accounts`);
    console.log(`  • ${gvAccounts.length} Giảng Viên accounts`);
    console.log(`  • ${svAccounts.length} Sinh Viên accounts`);
    console.log(`  • ${subjects.length} Internship Subjects`);
    console.log(`  • Page Headers and Sub Headers created`);
    console.log(`  • 5 Reports`);
    console.log(`  • 5 Internship Grades`);
    console.log(`  • 5 Chat Requests`);
    console.log(`  • 2 Chat Conversations`);
    console.log('\n🔑 Default password for all accounts: 123456');
    console.log('\n✅ You can now login with any account email and 123456');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed script
seedDatabase()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
