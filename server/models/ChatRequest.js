import mongoose from "mongoose";

const ChatRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    fromUser: {
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
      email: String,
      avatar: String
    },
    toUser: {
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
      email: String,
      avatar: String
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    subject: {
      type: String,
      maxlength: 200
    },
    requestType: {
      type: String,
      enum: ["chat", "support", "consultation", "approval", "information"],
      default: "chat"
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "declined", "expired", "cancelled"],
      default: "pending"
    },
    // For PDT binding system
    assignedTo: {
      userId: String,
      name: String,
      role: String,
      assignedAt: Date,
      assignedBy: String
    },
    isAssigned: {
      type: Boolean,
      default: false
    },
    // Response details
    responseMessage: String,
    respondedAt: Date,
    respondedBy: {
      userId: String,
      name: String,
      role: String
    },
    // Auto-expiration
    expiresAt: {
      type: Date,
      default: function() {
        // Default expiration: 7 days from creation
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    },
    // Conversation created from this request
    conversationId: {
      type: String,
      ref: 'ChatConversation'
    },
    // Related entities
    relatedTo: {
      type: String,
      enum: ["internship-subject", "report", "account", "general"],
      default: "general"
    },
    relatedId: String, // ID of related entity
    // Attachment support
    attachments: [{
      fileName: String,
      originalName: String,
      fileUrl: String,
      fileSize: Number,
      mimeType: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    // Tracking and audit
    viewedBy: [{
      userId: String,
      userName: String,
      viewedAt: { type: Date, default: Date.now }
    }],
    actionHistory: [{
      action: {
        type: String,
        enum: ["created", "assigned", "reassigned", "accepted", "declined", "cancelled", "expired"]
      },
      performedBy: {
        userId: String,
        name: String,
        role: String
      },
      timestamp: { type: Date, default: Date.now },
      note: String
    }],
    // Metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
      platform: String,
      urgentReason: String, // If priority is urgent
      tags: [String],
      department: String,
      semester: String
    }
  },
  {
    timestamps: true,
    collection: 'chatrequests'
  }
);

// Indexes for performance
ChatRequestSchema.index({ 'fromUser.userId': 1, status: 1, createdAt: -1 });
ChatRequestSchema.index({ 'toUser.userId': 1, status: 1, createdAt: -1 });
ChatRequestSchema.index({ 'assignedTo.userId': 1, status: 1, createdAt: -1 });
ChatRequestSchema.index({ status: 1, createdAt: -1 });
ChatRequestSchema.index({ priority: 1, status: 1, createdAt: -1 });
ChatRequestSchema.index({ expiresAt: 1 });
ChatRequestSchema.index({ relatedTo: 1, relatedId: 1 });

// Virtual for checking if request is expired
ChatRequestSchema.virtual('isExpired').get(function() {
  return this.status === 'pending' && this.expiresAt < new Date();
});

// Virtual for time remaining
ChatRequestSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'pending') return 0;
  const remaining = this.expiresAt.getTime() - Date.now();
  return Math.max(0, remaining);
});

// Pre-save middleware to add action history
ChatRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    this.actionHistory.push({
      action: 'created',
      performedBy: {
        userId: this.fromUser.userId,
        name: this.fromUser.name,
        role: this.fromUser.role
      },
      timestamp: new Date(),
      note: 'Yêu cầu chat được tạo'
    });
  }
  next();
});

// Instance method to assign request
ChatRequestSchema.methods.assignTo = function(assignee, assignedBy) {
  this.assignedTo = {
    userId: assignee.userId,
    name: assignee.name,
    role: assignee.role,
    assignedAt: new Date(),
    assignedBy: assignedBy
  };
  this.isAssigned = true;
  
  this.actionHistory.push({
    action: 'assigned',
    performedBy: {
      userId: assignedBy,
      name: assignee.name,
      role: assignee.role
    },
    timestamp: new Date(),
    note: `Được phân công cho ${assignee.name}`
  });
  
  return this;
};

// Instance method to accept request
ChatRequestSchema.methods.accept = function(respondent, responseMessage = '') {
  this.status = 'accepted';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  this.respondedBy = {
    userId: respondent.userId,
    name: respondent.name,
    role: respondent.role
  };
  
  this.actionHistory.push({
    action: 'accepted',
    performedBy: respondent,
    timestamp: new Date(),
    note: responseMessage || 'Yêu cầu được chấp nhận'
  });
  
  return this;
};

// Instance method to decline request
ChatRequestSchema.methods.decline = function(respondent, responseMessage = '') {
  this.status = 'declined';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  this.respondedBy = {
    userId: respondent.userId,
    name: respondent.name,
    role: respondent.role
  };
  
  this.actionHistory.push({
    action: 'declined',
    performedBy: respondent,
    timestamp: new Date(),
    note: responseMessage || 'Yêu cầu bị từ chối'
  });
  
  return this;
};

// Instance method to cancel request
ChatRequestSchema.methods.cancel = function(canceller, reason = '') {
  this.status = 'cancelled';
  
  this.actionHistory.push({
    action: 'cancelled',
    performedBy: {
      userId: canceller.userId,
      name: canceller.name,
      role: canceller.role
    },
    timestamp: new Date(),
    note: reason || 'Yêu cầu bị hủy bỏ'
  });
  
  return this;
};

// Instance method to mark as viewed
ChatRequestSchema.methods.markViewed = function(userId, userName) {
  const existingView = this.viewedBy.find(v => v.userId === userId);
  if (!existingView) {
    this.viewedBy.push({
      userId,
      userName,
      viewedAt: new Date()
    });
  }
  return this;
};

// Static method to find requests by user role
ChatRequestSchema.statics.findByUserRole = function(userId, role, options = {}) {
  const {
    status = null,
    isAssigned = null,
    limit = 50,
    skip = 0,
    sortBy = 'createdAt',
    sortOrder = -1,
    requestDirection = 'all' // 'incoming', 'outgoing', 'all'
  } = options;

  let query = {};

  // Build query based on role and direction
  if (role === 'phong-dao-tao') {
    if (requestDirection === 'incoming') {
      // PDT incoming: only requests that are either unassigned OR assigned specifically to this user
      query = {
        'toUser.role': 'phong-dao-tao',
        'fromUser.userId': { $ne: userId },
        $or: [
          { 'isAssigned': false }, // Unassigned requests
          { 'assignedTo.userId': userId } // Assigned to current user
        ]
      };
    } else if (requestDirection === 'outgoing') {
      // PDT outgoing: requests FROM them
      query = { 'fromUser.userId': userId };
    } else {
      // PDT all: own requests + requests assigned to them + unassigned incoming requests
      query = {
        $or: [
          { 'fromUser.userId': userId }, // Own requests
          { 'assignedTo.userId': userId }, // Assigned to current user
          { // Unassigned incoming requests to PDT (not from current user)
            'toUser.role': 'phong-dao-tao',
            'fromUser.userId': { $ne: userId },
            'isAssigned': false
          }
        ]
      };
    }
  } else {
    if (requestDirection === 'incoming') {
      // Others incoming: requests TO them (excluding their own)
      query = { 
        'toUser.userId': userId,
        'fromUser.userId': { $ne: userId }
      };
    } else if (requestDirection === 'outgoing') {
      // Others outgoing: requests FROM them
      query = { 'fromUser.userId': userId };
    } else {
      // Others all: requests FROM them and TO them
      query = {
        $or: [
          { 'fromUser.userId': userId },
          { 'toUser.userId': userId }
        ]
      };
    }
  }

  if (status) {
    query.status = status;
  }

  if (isAssigned !== null) {
    query.isAssigned = isAssigned;
  }

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to find pending requests for PDT assignment
ChatRequestSchema.statics.findPendingForPDT = function(options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({
    'toUser.role': 'phong-dao-tao',
    status: 'pending',
    isAssigned: false
  })
  .sort({ priority: -1, createdAt: 1 }) // Urgent first, then oldest first
  .limit(limit)
  .skip(skip)
  .lean();
};

// Static method to expire old requests
ChatRequestSchema.statics.expireOldRequests = function() {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' },
      $push: {
        actionHistory: {
          action: 'expired',
          performedBy: {
            userId: 'system',
            name: 'System',
            role: 'system'
          },
          timestamp: new Date(),
          note: 'Yêu cầu hết hạn tự động'
        }
      }
    }
  );
};

const ChatRequest = mongoose.model("ChatRequest", ChatRequestSchema);

export default ChatRequest;