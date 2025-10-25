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
    for (let i = 1; i <= 20; i++) {
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
    const departments = ['Công nghệ thông tin', 'Kinh tế', 'Kỹ thuật', 'Điện tử', 'Cơ khí'];
    for (let i = 1; i <= 20; i++) {
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
        department: departments[(i - 1) % departments.length]
      });
      
      console.log(`  ✓ ${account.id} - ${account.name}`);
    }

    // Create GV accounts
    console.log('\n👤 Creating Giảng Viên accounts...');
    const gvAccounts = [];
    for (let i = 1; i <= 20; i++) {
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
        department: departments[(i - 1) % departments.length],
        maxStudents: 5 + Math.floor(Math.random() * 6) // 5-10 students
      });
      
      console.log(`  ✓ ${account.id} - ${account.name}`);
    }

    // Create SV accounts
    console.log('\n👤 Creating Sinh Viên accounts...');
    const svAccounts = [];
    const classes = ['DHKTPM15A', 'DHKTPM15B', 'DHKTPM16A', 'DHKTPM16B', 'DHKTPM17A', 'DHKTPM17B', 'DHKTPM18A', 'DHKTPM18B'];
    for (let i = 1; i <= 20; i++) {
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
        studentClass: classes[(i - 1) % classes.length],
        year: 2024 + Math.floor((i - 1) / 10)
      });
      
      console.log(`  ✓ ${account.id} - ${account.name}`);
    }

    // Create Internship Subjects (each BCN can only manage one subject)
    console.log('\n📚 Creating Internship Subjects...');
    const subjects = [];
    const subjectTemplates = [
      { title: 'Thực tập tốt nghiệp CNTT', duration: '8 tuần', maxStudents: 30, dept: 'Công nghệ thông tin', status: 'open' },
      { title: 'Thực tập doanh nghiệp Kinh tế', duration: '10 tuần', maxStudents: 25, dept: 'Kinh tế', status: 'open' },
      { title: 'Thực tập kỹ thuật phần mềm', duration: '12 tuần', maxStudents: 20, dept: 'Công nghệ thông tin', status: 'locked' },
      { title: 'Thực tập Khoa học dữ liệu', duration: '8 tuần', maxStudents: 15, dept: 'Kỹ thuật', status: 'open' },
      { title: 'Thực tập An toàn thông tin', duration: '10 tuần', maxStudents: 20, dept: 'Điện tử', status: 'open' },
      { title: 'Thực tập Điện tử viễn thông', duration: '10 tuần', maxStudents: 25, dept: 'Điện tử', status: 'locked' },
      { title: 'Thực tập Kỹ thuật cơ khí', duration: '12 tuần', maxStudents: 20, dept: 'Cơ khí', status: 'open' },
      { title: 'Thực tập Kế toán doanh nghiệp', duration: '8 tuần', maxStudents: 30, dept: 'Kinh tế', status: 'locked' },
      { title: 'Thực tập Quản trị kinh doanh', duration: '10 tuần', maxStudents: 25, dept: 'Kỹ thuật', status: 'locked' },
      { title: 'Thực tập IoT và Embedded Systems', duration: '12 tuần', maxStudents: 15, dept: 'Cơ khí', status: 'locked' },
      { title: 'Thực tập Web Development', duration: '10 tuần', maxStudents: 25, dept: 'Công nghệ thông tin', status: 'open' },
      { title: 'Thực tập Mobile App Development', duration: '12 tuần', maxStudents: 20, dept: 'Kinh tế', status: 'open' },
      { title: 'Thực tập DevOps', duration: '8 tuần', maxStudents: 15, dept: 'Kỹ thuật', status: 'open' },
      { title: 'Thực tập Machine Learning', duration: '10 tuần', maxStudents: 15, dept: 'Điện tử', status: 'open' },
      { title: 'Thực tập Blockchain', duration: '12 tuần', maxStudents: 20, dept: 'Cơ khí', status: 'open' }
    ];

    // Use one BCN per subject to avoid conflicts
    for (let i = 0; i < Math.min(subjectTemplates.length, bcnAccounts.length); i++) {
      const template = subjectTemplates[i];
      const now = new Date();
      const regStart = new Date(now.getTime() + (i - 7) * 7 * 24 * 60 * 60 * 1000);
      const regEnd = new Date(regStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Get 2 lecturers for each subject
      const lecturerIds = [
        gvAccounts[i % gvAccounts.length]._id,
        gvAccounts[(i + 1) % gvAccounts.length]._id
      ];

      // Get 2 students for each subject
      const studentIds = [
        svAccounts[i % svAccounts.length]._id,
        svAccounts[(i + 10) % svAccounts.length]._id
      ];

      const subject = await InternshipSubject.create({
        title: template.title,
        description: `Môn thực tập ${template.title.toLowerCase()} dành cho sinh viên năm cuối`,
        duration: template.duration,
        maxStudents: template.maxStudents,
        registrationStartDate: regStart,
        registrationEndDate: regEnd,
        manager: bcnAccounts[i]._id, // Each BCN manages exactly one subject
        status: template.status,
        lecturers: lecturerIds,
        students: studentIds
      });
      subjects.push(subject);
      console.log(`  ✓ ${subject.id} - ${subject.title}`);
    }

    // Update SinhVien with subject relationships (each student gets one subject)
    for (let i = 0; i < svAccounts.length; i++) {
      await SinhVien.findOneAndUpdate(
        { account: svAccounts[i]._id },
        { 
          internshipSubject: subjects[i % subjects.length]._id,
          supervisor: gvAccounts[i % gvAccounts.length]._id,
          internshipStatus: i < 15 ? 'duoc-huong-dan' : 'chua-duoc-huong-dan'
        }
      );
    }

    // Update GiangVien with managed students (each lecturer gets multiple students)
    for (let i = 0; i < gvAccounts.length; i++) {
      const studentIds = svAccounts
        .filter((_, idx) => idx % gvAccounts.length === i)
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
    for (let i = 0; i < Math.min(bcnAccounts.length, subjects.length); i++) {
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
    
    // Create 20 reports with varied data
    for (let i = 0; i < 20; i++) {
      const report = await Report.create({
        title: `Báo cáo ${reportTypes[i % reportTypes.length]} - Kỳ ${Math.floor(i / reportTypes.length) + 1}`,
        content: `<h2>Báo cáo tiến độ thực tập - Kỳ ${Math.floor(i / reportTypes.length) + 1}</h2><p>Nội dung báo cáo chi tiết về quá trình thực tập, các hoạt động đã thực hiện và kết quả đạt được...</p>`,
        reportType: reportTypes[i % reportTypes.length],
        status: reportStatuses[i % reportStatuses.length],
        instructor: gvAccounts[i % gvAccounts.length]._id,
        internshipSubject: subjects[i % subjects.length]._id,
        submittedAt: i > 4 ? new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000) : null,
        reviewedAt: i > 9 ? new Date(Date.now() - (15 - i) * 24 * 60 * 60 * 1000) : null,
        reviewNote: i > 9 ? 'Báo cáo tốt, cần bổ sung thêm thông tin về tiến độ công việc' : '',
        attachments: []
      });
      console.log(`  ✓ ${report.id} - ${report.title}`);
    }

    // Create Internship Grades
    console.log('\n📊 Creating Internship Grades...');
    
    // Sample company data for internships
    const companies = [
      { name: 'FPT Software', address: '17 Duy Tân, Cầu Giấy, Hà Nội', supervisor: 'Nguyễn Văn An', email: 'nva@fpt.com.vn', phone: '0901234567' },
      { name: 'Viettel Solutions', address: '6 Phạm Văn Bạch, Cầu Giấy, Hà Nội', supervisor: 'Trần Thị Bình', email: 'ttb@viettel.vn', phone: '0902345678' },
      { name: 'VNG Corporation', address: 'Z06, đường số 13, Tân Thuận Đông, Quận 7, TP.HCM', supervisor: 'Lê Minh Chiến', email: 'lmc@vng.com.vn', phone: '0903456789' },
      { name: 'Tiki Corporation', address: '52 Út Tịch, Phường 4, Tân Bình, TP.HCM', supervisor: 'Phạm Thị Dung', email: 'ptd@tiki.vn', phone: '0904567890' },
      { name: 'MISA JSC', address: 'Tầng 5, Tòa nhà Lim Tower 3, Tố Hữu, Hà Nội', supervisor: 'Hoàng Văn Em', email: 'hve@misa.com.vn', phone: '0905678901' },
      { name: 'Shopee Vietnam', address: 'Tòa nhà Viettel, 285 Cách Mạng Tháng 8, Quận 10, TP.HCM', supervisor: 'Đỗ Thị Phương', email: 'dtp@shopee.vn', phone: '0906789012' },
      { name: 'Sendo Technology', address: 'Lầu 7, Vincom Center, 72 Lê Thánh Tôn, Quận 1, TP.HCM', supervisor: 'Vũ Văn Giang', email: 'vvg@sendo.vn', phone: '0907890123' },
      { name: 'Base.vn', address: '71 Nguyễn Chí Thanh, Đống Đa, Hà Nội', supervisor: 'Bùi Thị Hương', email: 'bth@base.vn', phone: '0908901234' },
      { name: 'VinID JSC', address: '458 Minh Khai, Hai Bà Trưng, Hà Nội', supervisor: 'Đinh Văn Ích', email: 'dvi@vinid.net', phone: '0909012345' },
      { name: 'Teko Vietnam', address: '92 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM', supervisor: 'Ngô Thị Kim', email: 'ntk@teko.vn', phone: '0910123456' }
    ];
    
    // Sample project topics for thesis
    const projectTopics = [
      'Xây dựng hệ thống quản lý thư viện trực tuyến sử dụng React và Node.js',
      'Phát triển ứng dụng di động quản lý chi tiêu cá nhân với React Native',
      'Thiết kế và triển khai website bán hàng trực tuyến với giỏ hàng và thanh toán',
      'Xây dựng chatbot hỗ trợ khách hàng sử dụng công nghệ AI và NLP',
      'Phát triển hệ thống theo dõi sức khỏe với IoT và ứng dụng mobile',
      'Thiết kế website tin tức với CMS và hệ thống phân quyền nâng cao',
      'Xây dựng ứng dụng quản lý học tập trực tuyến (E-learning platform)',
      'Phát triển hệ thống đặt phòng khách sạn với tích hợp thanh toán online',
      'Thiết kế game giáo dục cho trẻ em sử dụng Unity hoặc Phaser',
      'Xây dựng hệ thống quản lý nhân sự với dashboard và báo cáo thống kê'
    ];
    
    for (let i = 0; i < 20; i++) {
      const now = new Date();
      const startDate = new Date(now.getTime() - (60 + i * 5) * 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + (30 - i * 2) * 24 * 60 * 60 * 1000);
      const isInternship = i < 10;
      
      const grade = await InternshipGrade.create({
        student: svAccounts[i % svAccounts.length]._id,
        supervisor: gvAccounts[i % gvAccounts.length]._id,
        internshipSubject: subjects[i % subjects.length]._id,
        workType: isInternship ? 'thuc_tap' : 'do_an',
        startDate: startDate,
        endDate: endDate,
        company: isInternship ? {
          name: companies[i % companies.length].name,
          supervisorName: companies[i % companies.length].supervisor,
          supervisorEmail: companies[i % companies.length].email,
          supervisorPhone: companies[i % companies.length].phone,
          address: companies[i % companies.length].address,
          location: {
            lat: 10.762622 + (Math.random() - 0.5) * 0.1,
            lng: 106.660172 + (Math.random() - 0.5) * 0.1
          }
        } : undefined,
        projectTopic: isInternship ? undefined : projectTopics[(i - 10) % projectTopics.length],
        gradeComponents: [
          {
            type: 'supervisor_score',
            score: 6.5 + Math.random() * 3,
            weight: 0.7,
            comment: 'Điểm đánh giá từ giảng viên hướng dẫn',
            gradedBy: 'supervisor'
          },
          {
            type: 'company_score',
            score: 7.0 + Math.random() * 2.5,
            weight: 0.3,
            comment: isInternship ? 'Điểm đánh giá từ công ty' : 'Điểm đánh giá phản biện',
            gradedBy: 'company'
          }
        ],
        milestones: [
          {
            type: 'start',
            title: isInternship ? 'Bắt đầu thực tập' : 'Bắt đầu đồ án',
            description: isInternship ? 'Khởi tạo quá trình thực tập tại doanh nghiệp' : 'Khởi tạo dự án đồ án tốt nghiệp',
            dueDate: startDate,
            status: i < 15 ? 'completed' : 'pending',
            completedAt: i < 15 ? startDate : undefined,
            isCustom: false
          }
        ],
        status: i < 6 ? 'submitted' : i < 12 ? 'in_progress' : i < 18 ? 'draft_completed' : 'not_started',
        submittedToBCN: i < 6,
        submittedAt: i < 6 ? new Date(now.getTime() - (i * 2) * 24 * 60 * 60 * 1000) : undefined,
        supervisorFinalComment: i < 12 ? 'Sinh viên chăm chỉ, nhiệt tình trong quá trình thực tập/làm đồ án' : undefined
      });
      
      // Calculate final grade
      grade.calculateFinalGrade();
      await grade.save();
      
      const workTypeName = isInternship ? 'Thực tập' : 'Đồ án';
      console.log(`  ✓ Grade ${i + 1}/20 - ${workTypeName} for ${svAccounts[i % svAccounts.length].name} - Final: ${grade.finalGrade?.toFixed(2)}`);
    }

    // Create Chat Requests
    console.log('\n💬 Creating Chat Requests...');
    for (let i = 0; i < 20; i++) {
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
        message: `Xin chào thầy/cô, em muốn trao đổi về ${i % 3 === 0 ? 'vấn đề thực tập' : i % 3 === 1 ? 'đề tài đồ án' : 'tiến độ học tập'}`,
        requestType: 'chat',
        priority: i % 5 === 0 ? 'high' : 'normal',
        status: i < 10 ? 'accepted' : i < 15 ? 'pending' : 'declined'
      });
      console.log(`  ✓ Chat request ${i + 1}/20`);

      // Create conversation if accepted
      if (i < 10) {
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
    console.log(`  • 20 Reports`);
    console.log(`  • 20 Internship Grades`);
    console.log(`  • 20 Chat Requests`);
    console.log(`  • 10 Chat Conversations`);
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
