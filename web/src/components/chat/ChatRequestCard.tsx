import React from "react";
import type { ChatRequest } from "../../pages/PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../pages/PDT/chat/ChatTypes";
import dayjs from "dayjs";

interface ChatRequestCardProps {
  request: ChatRequest;
  currentUserId: string;
  currentUserRole: string;
  onAccept?: (request: ChatRequest) => void;
  onDecline?: (request: ChatRequest) => void;
  onClick?: (request: ChatRequest) => void;
  showActions?: boolean;
}

const ChatRequestCard: React.FC<ChatRequestCardProps> = ({
  request,
  currentUserId,
  currentUserRole,
  onAccept,
  onDecline,
  onClick,
  showActions = true
}) => {
  // Determine if this is an incoming request (user can act on it)
  const isIncoming = request.toUser?.id === currentUserId || 
                     (request.toUser?.role === 'phong-dao-tao' && currentUserRole === 'phong-dao-tao');
  
  // Determine if this is the user's own request
  const isOwnRequest = request.fromUser.id === currentUserId;
  
  // Determine if this request is assigned to current user
  const isAssignedToMe = request.assignedTo?.id === currentUserId;

  // Get the user to display (recipient for own requests, sender for incoming)
  const displayUser = isOwnRequest ? request.toUser : request.fromUser;

  // Get appropriate status indicators
  const getStatusInfo = () => {
    if (isOwnRequest) {
      if (request.status === 'cancelled') {
        return {
          text: "Đã hủy",
          className: "px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium"
        };
      }
      return {
        text: "Yêu cầu của bạn",
        className: "px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
      };
    }
    
    if (request.status === 'accepted') {
      return {
        text: "Đã chấp nhận",
        className: "px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium"
      };
    }
    
    if (request.status === 'declined') {
      return {
        text: "Đã từ chối",
        className: "px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium"
      };
    }
    
    if (request.status === 'cancelled') {
      return {
        text: "Đã hủy",
        className: "px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium"
      };
    }
    
    if (request.isAssigned && isAssignedToMe) {
      return {
        text: "Được phân cho bạn",
        className: "px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
      };
    }
    
    if (request.isAssigned && !isAssignedToMe && request.assignedTo) {
      return {
        text: `Phân cho: ${request.assignedTo.name}`,
        className: "px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium"
      };
    }
    
    return null;
  };

  const statusInfo = getStatusInfo();

  return (
    <div 
      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
      onClick={() => onClick?.(request)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">
            {displayUser?.name.charAt(0).toUpperCase() || '?'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isOwnRequest && (
              <span className="text-xs text-gray-500">Đến:</span>
            )}
            <span className="font-medium text-gray-900">{displayUser?.name || 'Không rõ'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[displayUser?.role || 'sinh-vien']}`}>
              {roleLabel[displayUser?.role || 'sinh-vien']}
            </span>
            {displayUser?.isOnline && (
              <span className="w-2 h-2 bg-green-500 rounded-full" title="Đang online"></span>
            )}
            {statusInfo && (
              <span className={statusInfo.className}>
                {statusInfo.text}
              </span>
            )}
          </div>

          {/* Subject if available */}
          {request.subject && (
            <div className="text-sm font-medium text-gray-800 mb-1">
              {request.subject}
            </div>
          )}

          {/* Message */}
          <p className="text-gray-600 text-sm line-clamp-2 mb-2">{request.message}</p>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{dayjs(request.timestamp).fromNow()}</span>
            {request.subject && (
              <span>• Yêu cầu hỗ trợ</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && isIncoming && !isOwnRequest && request.status === 'pending' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Decline button */}
            {onDecline && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDecline(request);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Từ chối"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path fill="currentColor" d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Accept button - PDT can accept unassigned OR requests assigned to them */}
            {onAccept && (!request.isAssigned || isAssignedToMe) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(request);
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Chấp nhận"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path fill="currentColor" d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRequestCard;
