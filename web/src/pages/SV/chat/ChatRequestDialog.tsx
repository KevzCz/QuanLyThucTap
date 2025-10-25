import React, { useState } from "react";
import Modal from "../../../util/Modal";
import type { ChatRequest } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import dayjs from "dayjs";
import { useAuth } from "../../../contexts/UseAuth";
import { chatAPI } from "../../../services/chatApi";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  request: ChatRequest | null;
  onAccept: (request: ChatRequest) => void;
  onDecline: (request: ChatRequest) => void;
}

const ChatRequestDialog: React.FC<Props> = ({ open, onClose, request, onAccept, onDecline }) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  if (!request) return null;

  // Check if this is the user's own request
  const isOwnRequest = request.fromUser.id === user?.id;
  const displayUser = isOwnRequest ? request.toUser : request.fromUser;

  const handleRevoke = async () => {
    if (!request) return;
    
    try {
      setLoading(true);
      await chatAPI.declineChatRequest(request.id, "Đã thu hồi yêu cầu");
      showSuccess("Đã hủy yêu cầu", "Yêu cầu chat của bạn đã được hủy");
      onDecline(request);
      onClose();
    } catch (error) {
      console.error("Error revoking request:", error);
      showError("Lỗi", "Không thể hủy yêu cầu chat. Vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  const getActions = () => {
    if (isOwnRequest) {
      // Own request - show revoke button
      return (
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Đóng
          </button>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="h-10 px-4 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300"
          >
            Thu hồi yêu cầu
          </button>
        </div>
      );
    } else {
      // Incoming request - show accept/decline buttons
      return (
        <div className="flex gap-3">
          <button
            onClick={() => onDecline(request)}
            disabled={loading}
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-300"
          >
            Từ chối
          </button>
          <button
            onClick={() => onAccept(request)}
            disabled={loading}
            className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            Chấp nhận
          </button>
        </div>
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isOwnRequest ? "Yêu cầu hỗ trợ của bạn" : "Yêu cầu chat hỗ trợ"}
      widthClass="max-w-md"
      actions={getActions()}
    >
      <div className="space-y-4">
        {isOwnRequest ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Đây là yêu cầu bạn đã gửi. Bạn có thể thu hồi yêu cầu này nếu cần.
            </div>
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-lg font-medium">
              {displayUser?.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isOwnRequest && <span className="text-xs text-gray-500">Gửi đến:</span>}
              <span className="font-medium text-gray-900">{displayUser?.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[displayUser?.role || 'sinh-vien']}`}>
                {roleLabel[displayUser?.role || 'sinh-vien']}
              </span>
              {displayUser?.isOnline && (
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </div>
            <div className="text-sm text-gray-600">ID: {displayUser?.id}</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {isOwnRequest ? "Nội dung yêu cầu của bạn:" : "Nội dung hỗ trợ:"}
          </div>
          <p className="text-gray-800">{request.message}</p>
        </div>

        <div className="text-xs text-gray-500">
          Gửi lúc: {dayjs(request.timestamp).format("DD/MM/YYYY HH:mm")}
        </div>

        {!isOwnRequest && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Chấp nhận sẽ tạo cuộc trò chuyện để bạn có thể nhận hỗ trợ trực tiếp.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ChatRequestDialog;
