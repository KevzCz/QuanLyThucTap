import mongoose from "mongoose";

const ChatConversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    participants: [{
      userId: {
        type: String,
        required: true,
        ref: 'Account'
      },
      name: {
        type: String,
        required: true
      },
      role: {
        type: String,
        required: true,
        enum: ["phong-dao-tao", "ban-chu-nhiem", "giang-vien", "sinh-vien"]
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      lastReadAt: {
        type: Date,
        default: Date.now
      }
    }],
    conversationType: {
      type: String,
      required: true,
      enum: ["direct", "group", "support"],
      default: "direct"
    },
    title: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastMessage: {
      messageId: String,
      content: String,
      senderId: String,
      senderName: String,
      timestamp: Date,
      type: {
        type: String,
        enum: ["text", "file", "system"],
        default: "text"
      }
    },
    messageCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: String,
      required: true,
      ref: 'Account'
    },
    metadata: {
      requestId: String, // If conversation started from a chat request
      subjectId: String, // If related to an internship subject
      reportId: String,  // If related to a report
      tags: [String]
    }
  },
  {
    timestamps: true,
    collection: 'chatconversations'
  }
);

// Indexes for performance
ChatConversationSchema.index({ "participants.userId": 1 });
ChatConversationSchema.index({ updatedAt: -1 });
ChatConversationSchema.index({ isActive: 1, updatedAt: -1 });
ChatConversationSchema.index({ conversationType: 1, updatedAt: -1 });

// Virtual for unread count per participant
ChatConversationSchema.virtual('unreadCounts').get(function() {
  return this.participants.map(participant => ({
    userId: participant.userId,
    unreadCount: 0 // This will be calculated in the API
  }));
});

// Instance method to add participant
ChatConversationSchema.methods.addParticipant = function(userId, name, role) {
  const existingParticipant = this.participants.find(p => p.userId === userId);
  if (!existingParticipant) {
    this.participants.push({
      userId,
      name,
      role,
      joinedAt: new Date(),
      lastReadAt: new Date()
    });
  }
  return this;
};

// Instance method to remove participant
ChatConversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId !== userId);
  return this;
};

// Instance method to update last read time
ChatConversationSchema.methods.updateLastRead = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.lastReadAt = new Date();
  }
  return this;
};

// Static method to find conversations by user ID
ChatConversationSchema.statics.findByUserId = function(userId, options = {}) {
  const {
    isActive = true,
    limit = 50,
    skip = 0,
    sortBy = 'updatedAt',
    sortOrder = -1
  } = options;

  return this.find({
    'participants.userId': userId,
    isActive: isActive
  })
  .sort({ [sortBy]: sortOrder })
  .limit(limit)
  .skip(skip)
  .lean();
};

// Static method to find conversation between specific users
ChatConversationSchema.statics.findBetweenUsers = function(userIds) {
  return this.findOne({
    'participants.userId': { $all: userIds },
    $expr: { $eq: [{ $size: "$participants" }, userIds.length] },
    isActive: true
  }).lean();
};

const ChatConversation = mongoose.model("ChatConversation", ChatConversationSchema);

export default ChatConversation;