import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    conversationId: {
      type: String,
      required: true,
      ref: 'ChatConversation',
      index: true
    },
    senderId: {
      type: String,
      required: true,
      ref: 'Account'
    },
    senderName: {
      type: String,
      required: true
    },
    senderRole: {
      type: String,
      required: true,
      enum: ["phong-dao-tao", "ban-chu-nhiem", "giang-vien", "sinh-vien"]
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000
    },
    type: {
      type: String,
      required: true,
      enum: ["text", "file", "system", "image"],
      default: "text"
    },
    // File attachment fields
    attachment: {
      fileName: String,
      originalName: String,
      fileUrl: String,
      fileSize: Number,
      mimeType: String,
      uploadedAt: Date
    },
    // Message status
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "deleted"],
      default: "sent"
    },
    // Reply/thread support
    replyToMessageId: {
      type: String,
      ref: 'ChatMessage'
    },
    replyToContent: String, // Cached content for quick display
    // Message reactions
    reactions: [{
      userId: String,
      emoji: String,
      timestamp: { type: Date, default: Date.now }
    }],
    // Edit history
    isEdited: {
      type: Boolean,
      default: false
    },
    editHistory: [{
      content: String,
      editedAt: { type: Date, default: Date.now }
    }],
    // Deletion
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    deletedBy: String,
    // Read receipts
    readBy: [{
      userId: String,
      userName: String,
      readAt: { type: Date, default: Date.now }
    }],
    // Metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
      platform: String,
      mentions: [String], // User IDs mentioned in the message
      isSystemMessage: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true,
    collection: 'chatmessages'
  }
);

// Indexes for performance and queries
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1, createdAt: -1 });
ChatMessageSchema.index({ conversationId: 1, isDeleted: 1, createdAt: -1 });
ChatMessageSchema.index({ replyToMessageId: 1 });
ChatMessageSchema.index({ 'metadata.mentions': 1 });
ChatMessageSchema.index({ type: 1, conversationId: 1 });

// Virtual for formatted timestamp
ChatMessageSchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toISOString();
});

// Instance method to add reaction
ChatMessageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(r => r.userId === userId);
  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.timestamp = new Date();
  } else {
    this.reactions.push({ userId, emoji, timestamp: new Date() });
  }
  return this;
};

// Instance method to remove reaction
ChatMessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.userId !== userId);
  return this;
};

// Instance method to mark as read
ChatMessageSchema.methods.markAsRead = function(userId, userName) {
  const existingRead = this.readBy.find(r => r.userId === userId);
  if (!existingRead) {
    this.readBy.push({
      userId,
      userName,
      readAt: new Date()
    });
  }
  return this;
};

// Instance method to edit message
ChatMessageSchema.methods.editContent = function(newContent) {
  if (!this.isEdited) {
    this.editHistory = [];
  }
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });
  this.content = newContent;
  this.isEdited = true;
  return this;
};

// Instance method to soft delete
ChatMessageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.content = "[Tin nhắn đã bị xóa]";
  return this;
};

// Static method to find messages by conversation
ChatMessageSchema.statics.findByConversation = function(conversationId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    before = null,
    after = null,
    includeDeleted = false
  } = options;

  let query = { conversationId };
  
  if (!includeDeleted) {
    query.isDeleted = { $ne: true };
  }

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  
  if (after) {
    query.createdAt = { ...query.createdAt, $gt: new Date(after) };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to find unread messages for a user
ChatMessageSchema.statics.findUnreadForUser = function(userId, conversationIds = []) {
  let query = {
    'readBy.userId': { $ne: userId },
    senderId: { $ne: userId }, // Don't include own messages
    isDeleted: { $ne: true }
  };

  if (conversationIds.length > 0) {
    query.conversationId = { $in: conversationIds };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to get message statistics
ChatMessageSchema.statics.getStats = function(conversationId, userId = null) {
  const pipeline = [
    { $match: { conversationId, isDeleted: { $ne: true } } }
  ];

  if (userId) {
    pipeline.push(
      { $match: { senderId: userId } }
    );
  }

  pipeline.push(
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        textMessages: { $sum: { $cond: [{ $eq: ["$type", "text"] }, 1, 0] } },
        fileMessages: { $sum: { $cond: [{ $eq: ["$type", "file"] }, 1, 0] } },
        imageMessages: { $sum: { $cond: [{ $eq: ["$type", "image"] }, 1, 0] } },
        firstMessage: { $min: "$createdAt" },
        lastMessage: { $max: "$createdAt" }
      }
    }
  );

  return this.aggregate(pipeline);
};

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);

export default ChatMessage;