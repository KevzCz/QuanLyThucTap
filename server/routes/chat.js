import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from 'url';
import ChatConversation from "../models/ChatConversation.js";
import ChatMessage from "../models/ChatMessage.js";
import ChatRequest from "../models/ChatRequest.js";
import Account from "../models/Account.js";
import authMiddleware from "../middleware/auth.js";
import notificationService from "../services/notificationService.js";

// Socket.io functions will be available through req.app.get('io')
const getIO = (req) => req.app.get('io');

// Throttling map for chat message notifications (key: conversationId:userId, value: timestamp)
const messageNotificationThrottle = new Map();
const THROTTLE_MINUTES = 5;

const router = express.Router();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'chat');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `chat-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: function (req, file, cb) {
    // Allowed file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Helper function to generate unique IDs
const generateId = (prefix = '') => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to get user info from account
const getUserInfo = async (userId) => {
  const account = await Account.findOne({ id: userId }).lean();
  if (!account) throw new Error('User not found');
  
  return {
    userId: account.id,
    name: account.name,
    role: account.role,
    email: account.email,
    avatar: account.avatar || null
  };
};

// ============================================================================
// CHAT REQUESTS ROUTES
// ============================================================================

// Get chat requests for current user
router.get("/requests", authMiddleware.authenticate, async (req, res) => {
  try {
    const { 
      status, 
      isAssigned, 
      limit = 50, 
      skip = 0, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      direction = 'incoming' // Default to incoming requests only
    } = req.query;
    const userId = req.account.id;
    const userRole = req.account.role;

    const options = {
      status: status || null,
      isAssigned: isAssigned ? isAssigned === 'true' : null,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1,
      requestDirection: direction
    };

    const requests = await ChatRequest.findByUserRole(userId, userRole, options);
    
    res.json({
      success: true,
      data: requests,
      pagination: {
        limit: options.limit,
        skip: options.skip,
        total: requests.length
      }
    });
  } catch (error) {
    console.error("Error fetching chat requests:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Create new chat request
router.post("/requests", authMiddleware.authenticate, upload.any(), async (req, res) => {
  try {
    const { toUserId, message, subject, requestType, priority, relatedTo, relatedId, urgentReason } = req.body;
    const fromUserId = req.account.id;

    // Validate required fields
    if (!toUserId || !message) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    // Get user information
    const fromUser = await getUserInfo(fromUserId);
    
    let toUser;
    if (toUserId === 'PDT_ROLE' || toUserId === 'phong-dao-tao') {
      // Special handling for PDT role requests
      toUser = {
        userId: 'phong-dao-tao',
        name: 'Phòng Đào Tạo',
        role: 'phong-dao-tao',
        email: 'pdt@example.com'
      };
    } else {
      toUser = await getUserInfo(toUserId);
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          fileUrl: `/api/chat/files/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        });
      }
    }

    // Create chat request
    const chatRequest = new ChatRequest({
      requestId: generateId('req_'),
      fromUser,
      toUser,
      message,
      subject: subject || '',
      requestType: requestType || 'chat',
      priority: priority || 'normal',
      attachments,
      relatedTo: relatedTo || 'general',
      relatedId: relatedId || '',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        platform: req.get('Sec-Ch-Ua-Platform') || 'unknown',
        urgentReason: priority === 'urgent' ? urgentReason : undefined
      }
    });

    await chatRequest.save();

    // Broadcast new chat request via Socket.io
    const io = getIO(req);
    
    // Send to target user
    io.to(`user_${toUserId}`).emit('newChatRequest', chatRequest);
    
    // If it's a PDT request, send to all PDT members
    if (toUser.role === 'phong-dao-tao') {
      io.emit('newPDTRequest', chatRequest);
    }

    // Send notification for chat request
    if (toUserId !== 'PDT_ROLE' && toUserId !== 'phong-dao-tao') {
      // Get the Account ObjectId for the recipient
      const toAccount = await Account.findOne({ id: toUserId }).select('_id');
      if (toAccount) {
        await notificationService.createNotification({
          recipient: toAccount._id,
          sender: req.account._id,
          type: 'chat-request',
          title: 'Yêu cầu chat mới',
          message: `${fromUser.name} đã gửi yêu cầu chat${subject ? `: ${subject}` : ''}`,
          link: '/chat',
          priority: priority === 'urgent' ? 'urgent' : 'normal',
          metadata: {
            requestId: chatRequest.requestId,
            requestType: requestType || 'chat',
            subject: subject || undefined
          }
        }, io);
      }
    }

    res.status(201).json({
      success: true,
      message: "Yêu cầu chat đã được gửi thành công",
      data: chatRequest
    });
  } catch (error) {
    console.error("Error creating chat request:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Get specific chat request
router.get("/requests/:requestId", authMiddleware.authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.account.id;

    const request = await ChatRequest.findOne({ requestId }).lean();
    if (!request) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu chat" });
    }

    // Check if user has permission to view this request
    const hasPermission = 
      request.fromUser.userId === userId ||
      request.toUser.userId === userId ||
      request.assignedTo?.userId === userId ||
      req.account.role === 'phong-dao-tao';

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
    }

    // Mark as viewed
    await ChatRequest.findOneAndUpdate(
      { requestId },
      { $addToSet: { viewedBy: { userId, userName: req.account.name, viewedAt: new Date() } } }
    );

    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Error fetching chat request:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Accept chat request
router.post("/requests/:requestId/accept", authMiddleware.authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { responseMessage } = req.body;
    const userId = req.account.id;

    const request = await ChatRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu chat" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Yêu cầu đã được xử lý" });
    }

    // Check permission to accept
    const canAccept = 
      request.toUser.userId === userId ||
      request.assignedTo?.userId === userId ||
      (req.account.role === 'phong-dao-tao' && request.toUser.role === 'phong-dao-tao');

    if (!canAccept) {
      return res.status(403).json({ success: false, message: "Không có quyền chấp nhận yêu cầu này" });
    }

    // Auto-assign to current PDT user if accepting an unassigned PDT request
    if (req.account.role === 'phong-dao-tao' && 
        request.toUser.role === 'phong-dao-tao' && 
        !request.isAssigned) {
      request.assignTo({
        userId: req.account.id,
        name: req.account.name,
        role: req.account.role
      });
      console.log(`🔄 Auto-assigned request ${requestId} to PDT user ${req.account.name}`);
    }

    // Accept the request
    request.accept({
      userId: req.account.id,
      name: req.account.name,
      role: req.account.role
    }, responseMessage);

    await request.save();

    // Create conversation if accepted
    const conversationId = generateId('conv_');
    
    // Determine the correct PDT participant (either toUser or assignedTo)
    const pdtParticipant = request.assignedTo?.userId === userId 
      ? {
          userId: request.assignedTo.userId,
          name: request.assignedTo.name,
          role: request.assignedTo.role,
          joinedAt: new Date(),
          lastReadAt: new Date()
        }
      : {
          userId: request.toUser.userId,
          name: request.toUser.userId === userId ? req.account.name : request.toUser.name,
          role: request.toUser.userId === userId ? req.account.role : request.toUser.role,
          joinedAt: new Date(),
          lastReadAt: new Date()
        };

    const conversation = new ChatConversation({
      conversationId,
      participants: [
        {
          userId: request.fromUser.userId,
          name: request.fromUser.name,
          role: request.fromUser.role,
          joinedAt: new Date(),
          lastReadAt: new Date()
        },
        pdtParticipant
      ],
      conversationType: 'direct',
      isActive: true,
      createdBy: request.fromUser.userId,
      metadata: {
        requestId: request.requestId
      }
    });

    await conversation.save();
    
    console.log(`💬 Conversation created: ${conversationId}`);
    console.log(`👥 Participants:`, conversation.participants.map(p => `${p.name} (${p.userId})`));

    // Update request with conversation ID
    request.conversationId = conversationId;
    await request.save();

    // Create system message
    const systemMessage = new ChatMessage({
      messageId: generateId('msg_'),
      conversationId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'phong-dao-tao',
      content: `Cuộc trò chuyện đã được bắt đầu từ yêu cầu: "${request.message}"`,
      type: 'system',
      metadata: {
        isSystemMessage: true
      }
    });

    await systemMessage.save();

    // Broadcast request update via Socket.io
    const io = getIO(req);
    io.to(`user_${request.fromUser.userId}`).emit('requestUpdated', request);
    if (request.assignedTo?.userId) {
      io.to(`user_${request.assignedTo.userId}`).emit('requestUpdated', request);
    }
    
    // Broadcast new conversation to participants
    const pdtUserId = request.assignedTo?.userId || request.toUser.userId;
    io.to(`user_${request.fromUser.userId}`).emit('newConversation', conversation);
    io.to(`user_${pdtUserId}`).emit('newConversation', conversation);

    // Send notification for request accepted
    const fromAccount = await Account.findOne({ id: request.fromUser.userId }).select('_id');
    if (fromAccount) {
      await notificationService.createNotification({
        recipient: fromAccount._id,
        sender: req.account._id,
        type: 'request-accepted',
        title: 'Yêu cầu chat được chấp nhận',
        message: `${request.acceptedBy.name} đã chấp nhận yêu cầu chat của bạn`,
        link: `/chat?conversation=${conversationId}`,
        priority: 'normal',
        metadata: {
          requestId: request.requestId,
          conversationId: conversationId
        }
      }, io);
    }

    res.json({
      success: true,
      message: "Đã chấp nhận yêu cầu và tạo cuộc trò chuyện",
      data: {
        request,
        conversation,
        conversationId
      }
    });
  } catch (error) {
    console.error("Error accepting chat request:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Decline chat request
router.post("/requests/:requestId/decline", authMiddleware.authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { responseMessage } = req.body;
    const userId = req.account.id;

    const request = await ChatRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu chat" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Yêu cầu đã được xử lý" });
    }

    // Check permission to decline
    const canDecline = 
      request.toUser.userId === userId ||
      request.assignedTo?.userId === userId ||
      (req.account.role === 'phong-dao-tao' && request.toUser.role === 'phong-dao-tao');

    if (!canDecline) {
      return res.status(403).json({ success: false, message: "Không có quyền từ chối yêu cầu này" });
    }

    // Decline the request
    request.decline({
      userId: req.account.id,
      name: req.account.name,
      role: req.account.role
    }, responseMessage);

    await request.save();

    // Broadcast request update via Socket.io
    const io = getIO(req);
    io.to(`user_${request.fromUser.userId}`).emit('requestUpdated', request);

    res.json({
      success: true,
      message: "Đã từ chối yêu cầu chat",
      data: request
    });
  } catch (error) {
    console.error("Error declining chat request:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Assign request (PDT only)
router.post("/requests/:requestId/assign", authMiddleware.authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { assignToUserId } = req.body;

    if (req.account.role !== 'phong-dao-tao') {
      return res.status(403).json({ success: false, message: "Chỉ PDT mới có quyền phân công" });
    }

    const request = await ChatRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu chat" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Yêu cầu đã được xử lý" });
    }

    const assignee = await getUserInfo(assignToUserId);
    if (assignee.role !== 'phong-dao-tao') {
      return res.status(400).json({ success: false, message: "Chỉ có thể phân công cho thành viên PDT" });
    }

    request.assignTo(assignee, req.account.id);
    await request.save();
    
    console.log(`🎯 Assignment completed: Request ${request.requestId} assigned to ${assignee.name} (${assignee.userId})`);
    console.log(`📊 Request details after assignment:`, {
      isAssigned: request.isAssigned,
      assignedTo: request.assignedTo,
      status: request.status
    });

    // Broadcast assignment update via Socket.io
    const io = getIO(req);
    
    console.log(`🔊 Broadcasting assignment update to:`);
    console.log(`   - Assignee: user_${assignee.userId}`);
    console.log(`   - Requester: user_${request.fromUser.userId}`);
    console.log(`   - All PDT: role_${assignee.role}`);
    
    // Notify the assignee
    io.to(`user_${assignee.userId}`).emit('requestUpdated', request);
    
    // Notify the requester
    io.to(`user_${request.fromUser.userId}`).emit('requestUpdated', request);
    
    // Notify all PDT members about the assignment
    io.to(`role_${assignee.role}`).emit('requestUpdated', request);

    res.json({
      success: true,
      message: `Đã phân công yêu cầu cho ${assignee.name}`,
      data: request
    });
  } catch (error) {
    console.error("Error assigning chat request:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// ============================================================================
// CONVERSATIONS ROUTES
// ============================================================================

// Get conversations for current user
router.get("/conversations", authMiddleware.authenticate, async (req, res) => {
  try {
    const { limit = 50, skip = 0, isActive = 'true' } = req.query;
    const userId = req.account.id;

    const conversations = await ChatConversation.findByUserId(userId, {
      isActive: isActive === 'true',
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Get unread counts for each conversation
    const conversationIds = conversations.map(c => c.conversationId);
    const unreadMessages = await ChatMessage.findUnreadForUser(userId, conversationIds);
    
    // Group unread messages by conversation
    const unreadCounts = {};
    unreadMessages.forEach(msg => {
      unreadCounts[msg.conversationId] = (unreadCounts[msg.conversationId] || 0) + 1;
    });

    // Add unread counts to conversations
    const conversationsWithUnread = conversations.map(conv => ({
      ...conv,
      unreadCount: unreadCounts[conv.conversationId] || 0
    }));

    res.json({
      success: true,
      data: conversationsWithUnread,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: conversations.length
      }
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Get specific conversation
router.get("/conversations/:conversationId", authMiddleware.authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.account.id;

    const conversation = await ChatConversation.findOne({ 
      conversationId,
      'participants.userId': userId 
    }).lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    // Update last read time
    await ChatConversation.findOneAndUpdate(
      { conversationId, 'participants.userId': userId },
      { $set: { 'participants.$.lastReadAt': new Date() } }
    );

    res.json({ success: true, data: conversation });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Create new conversation (direct chat)
router.post("/conversations", authMiddleware.authenticate, async (req, res) => {
  try {
    const { participantIds, title, conversationType = 'direct' } = req.body;
    const creatorId = req.account.id;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: "Cần ít nhất một người tham gia" });
    }

    // Check if direct conversation already exists between these users
    if (conversationType === 'direct' && participantIds.length === 1) {
      const allParticipants = [creatorId, ...participantIds];
      const existingConversation = await ChatConversation.findBetweenUsers(allParticipants);
      
      if (existingConversation) {
        return res.json({
          success: true,
          message: "Cuộc trò chuyện đã tồn tại",
          data: existingConversation
        });
      }
    }

    // Get participant information
    const participants = [];
    
    // Add creator
    const creator = await getUserInfo(creatorId);
    participants.push({
      userId: creator.userId,
      name: creator.name,
      role: creator.role,
      joinedAt: new Date(),
      lastReadAt: new Date()
    });

    // Add other participants
    for (const participantId of participantIds) {
      if (participantId !== creatorId) {
        const participant = await getUserInfo(participantId);
        participants.push({
          userId: participant.userId,
          name: participant.name,
          role: participant.role,
          joinedAt: new Date(),
          lastReadAt: new Date()
        });
      }
    }

    // Create conversation
    const conversationId = generateId('conv_');
    const conversation = new ChatConversation({
      conversationId,
      participants,
      conversationType,
      title: title || '',
      isActive: true,
      createdBy: creatorId
    });

    await conversation.save();

    res.status(201).json({
      success: true,
      message: "Cuộc trò chuyện đã được tạo thành công",
      data: conversation
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// ============================================================================
// MESSAGES ROUTES
// ============================================================================

// Get messages in a conversation
router.get("/conversations/:conversationId/messages", authMiddleware.authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, skip = 0, before, after } = req.query;
    const userId = req.account.id;
    
    console.log(`📨 Loading messages for conversation: ${conversationId} by user: ${userId}`);

    // Verify user is participant
    const conversation = await ChatConversation.findOne({
      conversationId,
      'participants.userId': userId
    });
    
    console.log(`🔍 Conversation found:`, conversation ? 'YES' : 'NO');
    if (!conversation) {
      console.log(`❌ Conversation not found or user not participant`);
      return res.status(404).json({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      before,
      after,
      includeDeleted: false
    };

    const messages = await ChatMessage.findByConversation(conversationId, options);

    // Mark messages as read
    const messageIds = messages.map(m => m.messageId);
    await ChatMessage.updateMany(
      {
        messageId: { $in: messageIds },
        senderId: { $ne: userId }
      },
      {
        $addToSet: {
          readBy: {
            userId,
            userName: req.account.name,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: messages.length
      }
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Send message
router.post("/conversations/:conversationId/messages", authMiddleware.authenticate, upload.single('attachment'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text', replyToMessageId } = req.body;
    const userId = req.account.id;

    // Verify user is participant
    const conversation = await ChatConversation.findOne({
      conversationId,
      'participants.userId': userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: "Nội dung tin nhắn không được trống" });
    }

    // Handle file attachment
    let attachment = null;
    if (req.file) {
      attachment = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: `/api/chat/files/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      };
    }

    // Get reply message if provided
    let replyToContent = null;
    if (replyToMessageId) {
      const replyMessage = await ChatMessage.findOne({ messageId: replyToMessageId }).lean();
      if (replyMessage) {
        replyToContent = replyMessage.content.substring(0, 100) + (replyMessage.content.length > 100 ? '...' : '');
      }
    }

    // Create message
    const messageId = generateId('msg_');
    const message = new ChatMessage({
      messageId,
      conversationId,
      senderId: userId,
      senderName: req.account.name,
      senderRole: req.account.role,
      content: content.trim(),
      type: req.file ? 'file' : type,
      attachment,
      replyToMessageId,
      replyToContent,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        platform: req.get('Sec-Ch-Ua-Platform') || 'unknown'
      }
    });

    await message.save();

    // Update conversation last message and message count
    conversation.lastMessage = {
      messageId: message.messageId,
      content: message.content,
      senderId: message.senderId,
      senderName: message.senderName,
      timestamp: message.createdAt,
      type: message.type
    };
    conversation.messageCount += 1;
    conversation.updatedAt = new Date();

    await conversation.save();

    // Broadcast new message via Socket.io
    const io = getIO(req);
    io.to(`conversation_${conversationId}`).emit('newMessage', message);
    
    // Update conversation participants about new message
    conversation.participants.forEach(participant => {
      if (participant.userId !== userId) {
        io.to(`user_${participant.userId}`).emit('conversationUpdated', {
          conversationId,
          lastMessage: conversation.lastMessage,
          updatedAt: conversation.updatedAt
        });
      }
    });

    // Send notification to other participants (with throttling)
    const now = Date.now();
    for (const participant of conversation.participants) {
      if (participant.userId !== userId) {
        const throttleKey = `${conversationId}:${participant.userId}`;
        const lastNotificationTime = messageNotificationThrottle.get(throttleKey) || 0;
        const timeSinceLastNotification = (now - lastNotificationTime) / 1000 / 60; // in minutes

        // Only send notification if more than THROTTLE_MINUTES have passed
        if (timeSinceLastNotification >= THROTTLE_MINUTES) {
          // Get participant Account ObjectId
          const participantAccount = await Account.findOne({ id: participant.userId }).select('_id');
          if (participantAccount) {
            await notificationService.createNotification({
              recipient: participantAccount._id,
              sender: req.account._id,
              type: 'chat-message',
              title: 'Tin nhắn mới',
              message: `${req.account.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
              link: `/chat?conversation=${conversationId}`,
              priority: 'normal',
              metadata: {
                conversationId: conversationId,
                messageId: message.messageId
              }
            }, io);

            // Update throttle map
            messageNotificationThrottle.set(throttleKey, now);
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Tin nhắn đã được gửi thành công",
      data: message
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// End conversation (PDT and BCN only)
router.put("/conversations/:conversationId/end", authMiddleware.authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason = '' } = req.body;
    const userId = req.account.id;
    const userRole = req.account.role;

    // Only PDT and BCN can end conversations
    if (!['phong-dao-tao', 'ban-chu-nhiem'].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Chỉ PDT và BCN mới có quyền kết thúc cuộc trò chuyện" });
    }

    // Verify conversation exists and user is participant
    const conversation = await ChatConversation.findOne({
      conversationId,
      'participants.userId': userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    if (!conversation.isActive) {
      return res.status(400).json({ success: false, message: "Cuộc trò chuyện đã được kết thúc" });
    }

    // Update conversation status
    conversation.isActive = false;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Create system message about ending conversation
    const systemMessage = new ChatMessage({
      messageId: generateId('msg_'),
      conversationId,
      senderId: userId,
      senderName: req.account.name,
      senderRole: userRole,
      content: `Cuộc trò chuyện đã được kết thúc bởi ${req.account.name}${reason ? `. Lý do: ${reason}` : '.'}`,
      type: 'system',
      metadata: {
        isSystemMessage: true,
        endedBy: userId,
        endReason: reason
      }
    });

    await systemMessage.save();

    // Update conversation's last message
    conversation.lastMessage = {
      messageId: systemMessage.messageId,
      content: systemMessage.content,
      senderId: systemMessage.senderId,
      senderName: systemMessage.senderName,
      timestamp: systemMessage.createdAt,
      type: systemMessage.type
    };
    await conversation.save();

    // Broadcast conversation end via Socket.io
    const io = getIO(req);
    conversation.participants.forEach(participant => {
      io.to(`user_${participant.userId}`).emit('conversationEnded', {
        conversationId,
        endedBy: {
          userId,
          name: req.account.name,
          role: userRole
        },
        reason,
        timestamp: new Date()
      });
    });

    res.json({
      success: true,
      message: "Cuộc trò chuyện đã được kết thúc thành công",
      data: {
        conversationId,
        isActive: false,
        endedBy: {
          userId,
          name: req.account.name,
          role: userRole
        },
        endedAt: new Date(),
        reason
      }
    });
  } catch (error) {
    console.error("Error ending conversation:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// ============================================================================
// FILE SERVING ROUTE
// ============================================================================

// Serve uploaded chat files
router.get("/files/:filename", authMiddleware.authenticate, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', 'chat', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ success: false, message: "File không tồn tại" });
    }

    // TODO: Add permission check - verify user has access to this file
    
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// ============================================================================
// ADDITIONAL UTILITY ROUTES
// ============================================================================

// Search conversations and messages
router.get("/search", authMiddleware.authenticate, async (req, res) => {
  try {
    const { q, type = 'all', limit = 20 } = req.query;
    const userId = req.account.id;

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: "Từ khóa tìm kiếm không được trống" });
    }

    const searchTerm = q.trim();
    const results = { conversations: [], messages: [] };

    // Search conversations
    if (type === 'all' || type === 'conversations') {
      const conversations = await ChatConversation.find({
        'participants.userId': userId,
        isActive: true,
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { 'participants.name': { $regex: searchTerm, $options: 'i' } }
        ]
      }).limit(parseInt(limit)).lean();
      
      results.conversations = conversations;
    }

    // Search messages
    if (type === 'all' || type === 'messages') {
      // First get user's conversation IDs
      const userConversations = await ChatConversation.find({
        'participants.userId': userId,
        isActive: true
      }).select('conversationId').lean();
      
      const conversationIds = userConversations.map(c => c.conversationId);
      
      const messages = await ChatMessage.find({
        conversationId: { $in: conversationIds },
        content: { $regex: searchTerm, $options: 'i' },
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
      
      results.messages = messages;
    }

    res.json({
      success: true,
      data: results,
      searchTerm,
      totalResults: results.conversations.length + results.messages.length
    });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Get unread message count for user
router.get("/unread-count", authMiddleware.authenticate, async (req, res) => {
  try {
    const userId = req.account.id;
    
    // Get user's conversations
    const conversations = await ChatConversation.find({
      'participants.userId': userId,
      isActive: true
    }).select('conversationId').lean();
    
    const conversationIds = conversations.map(c => c.conversationId);
    
    // Count unread messages
    const unreadCount = await ChatMessage.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId },
      isDeleted: { $ne: true }
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Get chat statistics
router.get("/stats", authMiddleware.authenticate, async (req, res) => {
  try {
    const userId = req.account.id;
    
    // Get user's conversations
    const totalConversations = await ChatConversation.countDocuments({
      'participants.userId': userId,
      isActive: true
    });
    
    // Get pending requests
    const pendingRequests = await ChatRequest.countDocuments({
      $or: [
        { 'toUser.userId': userId },
        { 'assignedTo.userId': userId }
      ],
      status: 'pending'
    });
    
    // Get messages sent today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const messagesToday = await ChatMessage.countDocuments({
      senderId: userId,
      createdAt: { $gte: todayStart },
      isDeleted: { $ne: true }
    });

    res.json({
      success: true,
      data: {
        totalConversations,
        pendingRequests,
        messagesToday
      }
    });
  } catch (error) {
    console.error("Error getting chat stats:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// Get available users for chat
router.get("/users", authMiddleware.authenticate, async (req, res) => {
  try {
    const { role } = req.query;
    const currentUserId = req.account.id;
    const userRole = req.account.role;

    let users = [];

    if (userRole === 'ban-chu-nhiem') {
      // BCN can only chat with users in their managed internship subject
      const BanChuNhiem = (await import('../models/BanChuNhiem.js')).default;
      const InternshipSubject = (await import('../models/InternshipSubject.js')).default;
      
      const bcnProfile = await BanChuNhiem.findOne({ account: req.account._id })
        .populate('internshipSubject');
        
      if (!bcnProfile || !bcnProfile.internshipSubject) {
        return res.json({ success: true, data: [] });
      }

      const subject = await InternshipSubject.findById(bcnProfile.internshipSubject._id)
        .populate('lecturers', 'id name role email avatar')
        .populate('students', 'id name role email avatar');

      let availableUsers = [];

      // Always include PDT accounts for BCN
      const pdtAccounts = await Account.find({ 
        role: 'phong-dao-tao', 
        status: 'open',
        id: { $ne: currentUserId }
      }).select('id name role email avatar').lean();
      availableUsers.push(...pdtAccounts);

      // Add lecturers from the subject
      if (subject.lecturers) {
        availableUsers.push(...subject.lecturers.filter(lecturer => lecturer.id !== currentUserId));
      }

      // Add students from the subject  
      if (subject.students) {
        availableUsers.push(...subject.students.filter(student => student.id !== currentUserId));
      }

      // Filter by role if specified
      if (role && role !== 'all') {
        availableUsers = availableUsers.filter(user => user.role === role);
      }

      // Transform to ChatUser format
      users = availableUsers.map(account => ({
        userId: account.id,
        name: account.name,
        role: account.role,
        email: account.email,
        avatar: account.avatar || null,
        isOnline: false
      }));

    } else if (userRole === 'giang-vien') {
      // GV can chat with: PDT, their BCN, and their supervised students
      const GiangVien = (await import('../models/GiangVien.js')).default;
      const SinhVien = (await import('../models/SinhVien.js')).default;
      const InternshipSubject = (await import('../models/InternshipSubject.js')).default;
      
      const gvProfile = await GiangVien.findOne({ account: req.account._id })
        .populate('internshipSubject');
        
      let availableUsers = [];

      // Always include PDT accounts
      const pdtAccounts = await Account.find({ 
        role: 'phong-dao-tao', 
        status: 'open',
        id: { $ne: currentUserId }
      }).select('id name role email avatar').lean();
      availableUsers.push(...pdtAccounts);

      if (gvProfile && gvProfile.internshipSubject) {
        // Include their BCN (subject manager)
        const subject = await InternshipSubject.findById(gvProfile.internshipSubject._id)
          .populate('manager', 'id name role email avatar');
        
        if (subject.manager && subject.manager.id !== currentUserId) {
          availableUsers.push(subject.manager);
        }

        // Include their supervised students
        const supervisedStudents = await SinhVien.find({ 
          supervisor: req.account._id 
        }).populate('account', 'id name role email avatar');
        
        supervisedStudents.forEach(student => {
          if (student.account && student.account.id !== currentUserId) {
            availableUsers.push(student.account);
          }
        });
      }

      // Filter by role if specified
      if (role && role !== 'all') {
        availableUsers = availableUsers.filter(user => user.role === role);
      }

      // Transform to ChatUser format
      users = availableUsers.map(account => ({
        userId: account.id,
        name: account.name,
        role: account.role,
        email: account.email,
        avatar: account.avatar || null,
        isOnline: false
      }));

    } else if (userRole === 'sinh-vien') {
      // SV can chat with: PDT, their BCN, and their supervisor (GV)
      const SinhVien = (await import('../models/SinhVien.js')).default;
      const InternshipSubject = (await import('../models/InternshipSubject.js')).default;
      
      const svProfile = await SinhVien.findOne({ account: req.account._id })
        .populate('internshipSubject')
        .populate('supervisor', 'id name role email avatar');
        
      let availableUsers = [];

      // Always include PDT accounts
      const pdtAccounts = await Account.find({ 
        role: 'phong-dao-tao', 
        status: 'open',
        id: { $ne: currentUserId }
      }).select('id name role email avatar').lean();
      availableUsers.push(...pdtAccounts);

      if (svProfile) {
        // Include their BCN (subject manager) if they have a subject
        if (svProfile.internshipSubject) {
          const subject = await InternshipSubject.findById(svProfile.internshipSubject._id)
            .populate('manager', 'id name role email avatar');
          
          if (subject.manager && subject.manager.id !== currentUserId) {
            availableUsers.push(subject.manager);
          }
        }

        // Include their supervisor
        if (svProfile.supervisor && svProfile.supervisor.id !== currentUserId) {
          availableUsers.push(svProfile.supervisor);
        }
      }

      // Filter by role if specified
      if (role && role !== 'all') {
        availableUsers = availableUsers.filter(user => user.role === role);
      }

      // Transform to ChatUser format
      users = availableUsers.map(account => ({
        userId: account.id,
        name: account.name,
        role: account.role,
        email: account.email,
        avatar: account.avatar || null,
        isOnline: false
      }));

    } else {
      // For PDT or other roles, use the existing logic (can access all users)
      let query = { 
        id: { $ne: currentUserId },
        status: 'open'
      };

      if (role && role !== 'all') {
        query.role = role;
      }

      const accounts = await Account.find(query)
        .select('id name role email avatar')
        .sort({ name: 1 })
        .lean();

      users = accounts.map(account => ({
        userId: account.id,
        name: account.name,
        role: account.role,
        email: account.email,
        avatar: account.avatar || null,
        isOnline: false
      }));
    }

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error("Error getting available users:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
});

export default router;
