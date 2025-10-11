import React, { useState, useRef, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { ChatConversation, ChatMessage, ChatUser } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: ChatConversation | null;
  currentUser: ChatUser;
}

// Mock messages for SV conversation
const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "msg1",
    senderId: "SV001",
    content: "Thầy ơi, em cần hỗ trợ về báo cáo thực tập tuần này ạ.",
    timestamp: "2025-01-20T14:30:00",
    type: "text",
  },
  {
    id: "msg2",
    senderId: "GV002",
    content: "Chào em! Thầy sẽ hỗ trợ em. Em gặp khó khăn gì cụ thể trong báo cáo?",
    timestamp: "2025-01-20T14:32:00",
    type: "text",
  },
  {
    id: "msg3",
    senderId: "SV001",
    content: "Em không biết viết phần đánh giá kết quả công việc như thế nào cho đúng ạ.",
    timestamp: "2025-01-20T14:35:00",
    type: "text",
  },
  {
    id: "msg4",
    senderId: "GV002",
    content: "Em cần mô tả cụ thể công việc đã làm, kết quả đạt được, và những khó khăn gặp phải. Thầy sẽ gửi em mẫu báo cáo để tham khảo.",
    timestamp: "2025-01-20T14:37:00",
    type: "text",
  },
  {
    id: "msg5",
    senderId: "SV001",
    content: "Cảm ơn thầy ạ! Em sẽ tham khảo và hoàn thiện báo cáo.",
    timestamp: "2025-01-20T14:40:00",
    type: "text",
  },
];

const ChatDialog: React.FC<Props> = ({ open, onClose, conversation, currentUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = conversation?.participants.find(p => p.id !== currentUser.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !conversation) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: "text",
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation || !otherUser) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium">
              {otherUser.name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{otherUser.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[otherUser.role]}`}>
                {roleLabel[otherUser.role]}
              </span>
              {otherUser.isOnline && (
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {otherUser.isOnline ? "Đang hoạt động" : "Không hoạt động"}
            </div>
          </div>
        </div>
      }
      widthClass="max-w-2xl"
    >
      <div className="flex flex-col h-96">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.senderId === currentUser.id;
            const sender = isOwn ? currentUser : otherUser;
            
            return (
              <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2 max-w-xs ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">
                      {sender?.name.charAt(0)}
                    </span>
                  </div>
                  <div className={`rounded-lg px-3 py-2 ${
                    isOwn 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      isOwn ? "text-blue-200" : "text-gray-500"
                    }`}>
                      {dayjs(message.timestamp).format("HH:mm")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChatDialog;
