import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// Import route modules
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import uploadRoutes from "./routes/uploads.js";
import internshipSubjectRoutes from "./routes/internshipSubjects.js";
import lecturerRoutes from "./routes/lecturers.js";
import pageManagementRoutes from "./routes/pageManagement.js";
import studentRoutes from "./routes/students.js";
import requestRoutes from "./routes/requests.js";
import reportRoutes from "./routes/reports.js";
import chatRoutes from "./routes/chat.js";
import notificationRoutes from "./routes/notifications.js";
import deadlineReminderService from "./services/deadlineReminderService.js";
const app = express();
const httpServer = createServer(app);

// Configure Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  },
  transports: ['websocket', 'polling']
});

/* Basic middlewares */
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Make io available to routes
app.set('io', io);

/* Static uploads */
const uploadsDir = path.resolve("./uploads");
app.use("/uploads", express.static(uploadsDir));
app.use("/api/students", studentRoutes);
/* MongoDB connection */
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/QLTT";

console.log('Connecting to MongoDB...');

try {
  await mongoose.connect(uri, {
    dbName: 'QLTT'
  });
  console.log('✅ Connected to MongoDB - Database: QLTT');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('📋 Available collections:', collections.map(c => c.name));
  
  // Initialize deadline reminder service
  deadlineReminderService.init(io);
} catch (error) {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
}

/* Health check route */
app.get("/api/health", (_req, res) => {
  res.json({ 
    ok: true, 
    time: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

/* Route modules */
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/internship-subjects", internshipSubjectRoutes);
app.use("/api/lecturers", lecturerRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/pages", pageManagementRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);

// Add the teacher-specific page routes from pages.js
import pagesRoutes from "./routes/pages.js";
app.use("/api/pages", pagesRoutes);

/* Legacy routes for backward compatibility */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["PDT", "BCN", "GV", "SV"], required: true },
    department: { type: String }
  },
  { timestamps: true }
);
const User = mongoose.model("User", UserSchema);

const InternshipCourseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: { type: String, required: true },
    lecturers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);
const InternshipCourse = mongoose.model("InternshipCourse", InternshipCourseSchema);

app.post("/api/users", async (req, res) => {
  try {
    const created = await User.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/courses", async (_req, res) => {
  try {
    const data = await InternshipCourse.find().populate("lecturers").populate("students").lean();
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* Error handling middleware */
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Đã xảy ra lỗi máy chủ' 
      : error.message 
  });
});

/* Socket.io connection handling */
const activeUsers = new Map(); // Store active users and their socket connections

io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // Handle user authentication
  socket.on('authenticate', (userData) => {
    if (userData && userData.id) {
      socket.userId = userData.id;
      socket.userName = userData.name;
      socket.userRole = userData.role;
      
      activeUsers.set(userData.id, {
        socketId: socket.id,
        name: userData.name,
        role: userData.role,
        lastSeen: new Date()
      });

      // Join user to their personal room
      socket.join(`user_${userData.id}`);
      socket.join(userData.id); // Also join using just the ID for notifications
      
      // Join user to their role room
      if (userData.role) {
        socket.join(`role_${userData.role}`);
        console.log(`🔐 User ${userData.name} joined role room: role_${userData.role}`);
      }
      
      // Broadcast user online status
      socket.broadcast.emit('userOnline', {
        userId: userData.id,
        name: userData.name,
        role: userData.role
      });

      console.log(`👤 User authenticated: ${userData.name} (${userData.id})`);
    }
  });

  // Join conversation rooms
  socket.on('joinConversation', (conversationId) => {
    if (conversationId) {
      socket.join(`conversation_${conversationId}`);
      console.log(`💬 User ${socket.userId} joined conversation: ${conversationId}`);
    }
  });

  // Leave conversation rooms
  socket.on('leaveConversation', (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation_${conversationId}`);
      console.log(`👋 User ${socket.userId} left conversation: ${conversationId}`);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    if (data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('userTyping', {
        userId: socket.userId,
        userName: socket.userName,
        conversationId: data.conversationId
      });
    }
  });

  socket.on('stopTyping', (data) => {
    if (data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('userStoppedTyping', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    }
  });

  // Handle message read receipts
  socket.on('markAsRead', (data) => {
    if (data.conversationId && data.messageId) {
      socket.to(`conversation_${data.conversationId}`).emit('messageRead', {
        messageId: data.messageId,
        readBy: {
          userId: socket.userId,
          userName: socket.userName,
          readAt: new Date()
        }
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    if (socket.userId) {
      activeUsers.delete(socket.userId);
      
      // Broadcast user offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.userId
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Broadcast new messages to conversation participants
export const broadcastMessage = (conversationId, message) => {
  io.to(`conversation_${conversationId}`).emit('newMessage', message);
};

// Broadcast new chat requests
export const broadcastChatRequest = (request) => {
  // Send to target user
  io.to(`user_${request.toUser.userId}`).emit('newChatRequest', request);
  
  // If it's a PDT request, send to all PDT members
  if (request.toUser.role === 'phong-dao-tao') {
    io.emit('newPDTRequest', request);
  }
};

// Broadcast request status updates
export const broadcastRequestUpdate = (request) => {
  io.to(`user_${request.fromUser.userId}`).emit('requestUpdated', request);
  if (request.assignedTo?.userId) {
    io.to(`user_${request.assignedTo.userId}`).emit('requestUpdated', request);
  }
};

// Get active users
export const getActiveUsers = () => {
  return Array.from(activeUsers.values());
};

// Broadcast notification to specific user
export const broadcastNotification = (userId, notification) => {
  io.to(userId.toString()).emit('newNotification', notification);
};

// Broadcast notification to multiple users
export const broadcastNotificationToMany = (userIds, notification) => {
  userIds.forEach(userId => {
    io.to(userId.toString()).emit('newNotification', notification);
  });
};

/* Start server */
const port = Number(process.env.PORT || 3001);
httpServer.listen(port, () => {
  console.log(`🚀 API server listening on http://localhost:${port}`);
  console.log(`📖 API documentation: http://localhost:${port}/api/health`);
  console.log(`💬 Socket.io enabled for real-time chat`);
});
