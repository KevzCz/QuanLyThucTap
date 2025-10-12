import React from "react";
import Modal from "../../../util/Modal";
import type { ChatRequest, ChatUser } from "./ChatTypes";
import { roleLabel, roleColor } from "./ChatTypes";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onClose: () => void;
  request: ChatRequest | null;
  onAccept: (request: ChatRequest) => void;
  onDecline: (request: ChatRequest) => void;
  onBind: (request: ChatRequest) => void;
  currentUser: ChatUser;
}

const ChatRequestDialog: React.FC<Props> = ({ 
  open, 
  onClose, 
  request, 
  onAccept, 
  onDecline, 
  onBind, 
  currentUser 
}) => {
  if (!request) return null;

  const isAssignedToMe = request.assignedTo?.id === currentUser.id;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAssignedToOther = request.isAssigned && !isAssignedToMe;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yêu cầu chat"
      widthClass="max-w-md"
      actions={
        <div className="flex gap-3">
          <button
            onClick={() => onDecline(request)}
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Từ chối
          </button>
          {!request.isAssigned && (
            <button
              onClick={() => onBind(request)}
              className="h-10 px-4 rounded-md bg-orange-600 text-white hover:bg-orange-700"
            >
              Nhận xử lý
            </button>
          )}
          {(isAssignedToMe || !request.isAssigned) && (
            <button
              onClick={() => onAccept(request)}
              className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Chấp nhận & Chat
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-lg font-medium">
              {request.fromUser.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">{request.fromUser.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[request.fromUser.role]}`}>
                {roleLabel[request.fromUser.role]}
              </span>
              {request.fromUser.isOnline && (
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </div>
            <div className="text-sm text-gray-600">ID: {request.fromUser.id}</div>
          </div>
        </div>

        {/* Assignment status */}
        {request.isAssigned && (
          <div className={`rounded-lg p-3 ${
            isAssignedToMe 
              ? "bg-blue-50 border border-blue-200"
              : "bg-yellow-50 border border-yellow-200"
          }`}>
            <div className={`text-sm ${
              isAssignedToMe ? "text-blue-800" : "text-yellow-800"
            }`}>
              <strong>Trạng thái:</strong> {
                isAssignedToMe 
                  ? "Đã được phân cho bạn" 
                  : `Đang được xử lý bởi ${request.assignedTo?.name}`
              }
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Nội dung yêu cầu:</div>
          <p className="text-gray-800">{request.message}</p>
        </div>

        <div className="text-xs text-gray-500">
          Gửi lúc: {dayjs(request.timestamp).format("DD/MM/YYYY HH:mm")}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <strong>Hướng dẫn:</strong> 
            {!request.isAssigned ? (
              " Nhấn 'Nhận xử lý' để phân công cho bạn, sau đó 'Chấp nhận & Chat' để bắt đầu trò chuyện."
            ) : isAssignedToMe ? (
              " Yêu cầu đã được phân cho bạn. Nhấn 'Chấp nhận & Chat' để bắt đầu trò chuyện."
            ) : (
              " Yêu cầu này đang được xử lý bởi đồng nghiệp khác."
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChatRequestDialog;
