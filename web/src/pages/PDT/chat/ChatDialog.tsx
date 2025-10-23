import React, { useState, useRef, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { ChatConversation, ChatMessage, ChatUser } from "./ChatTypes";
import { roleLabel, roleColor } from "./ChatTypes";
import { chatAPI } from "../../../services/chatApi";
import { socketManager } from "../../../services/socketManager";
import dayjs from "dayjs";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: ChatConversation | null;
  currentUser: ChatUser;
  onConversationEnded?: () => void;
}

const ChatDialog: React.FC<Props> = ({ open, onClose, conversation, currentUser, onConversationEnded }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = conversation?.participants.find(p => p.id !== currentUser.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation?.id) {
        setMessages([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversation.id}/messages`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const responseData = await response.json();
          const messagesData = responseData.data || [];
          // Transform messages to match expected format
          const transformedMessages = messagesData.map((msg: Record<string, unknown>) => ({
            ...msg,
            id: msg.messageId || msg.id, // Map messageId to id
            timestamp: msg.createdAt || msg.timestamp // Map createdAt to timestamp
          }));
          setMessages(transformedMessages);
        } else {
          console.error('Failed to load messages');
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      }
    };

    loadMessages();
  }, [conversation?.id]);

  // Listen for real-time messages via Socket.io
  useEffect(() => {
    if (!conversation?.id) return;

    // Join the conversation room
    socketManager.joinConversation(conversation.id);

    // Listen for new messages
    const handleNewMessage = (...args: unknown[]) => {
      const message = args[0] as ChatMessage & { messageId?: string; createdAt?: string };
      // Only add message if it's for this conversation
      if (message) {
        const transformedMessage = {
          ...message,
          id: message.messageId || message.id,
          timestamp: message.createdAt || message.timestamp
        };
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === transformedMessage.id)) {
            return prev;
          }
          return [...prev, transformedMessage];
        });
      }
    };

    socketManager.on('newMessage', handleNewMessage);

    return () => {
      socketManager.off('newMessage', handleNewMessage);
      socketManager.leaveConversation(conversation.id);
    };
  }, [conversation?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      // Send message to server - Socket.IO will broadcast it back to all participants
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: messageContent,
          type: 'text'
        })
      });

      if (!response.ok) {
        console.error('Failed to send message');
        // Restore message content to input on failure
        setNewMessage(messageContent);
      }
      // Note: We don't manually add the message here
      // The Socket.IO 'newMessage' listener will add it automatically
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message content to input on error
      setNewMessage(messageContent);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndConversation = async () => {
    if (!conversation) return;
    
    try {
      setLoading(true);
      await chatAPI.endConversation(conversation.id, endReason.trim());
      
      // Call callback to refresh conversations list
      if (onConversationEnded) {
        onConversationEnded();
      }
      
      // Close dialogs
      setShowEndDialog(false);
      onClose();
    } catch (error) {
      console.error('Error ending conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!conversation || !otherUser) return null;

  // Check if conversation is already ended
  const isConversationActive = conversation.isActive !== false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full">
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
                {!isConversationActive && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Đã kết thúc
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {otherUser.isOnline ? "Đang hoạt động" : "Không hoạt động"}
              </div>
            </div>
          </div>
          {isConversationActive && currentUser.role === 'phong-dao-tao' && (
            <button
              onClick={() => setShowEndDialog(true)}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Kết thúc cuộc trò chuyện"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
      }
      widthClass="max-w-2xl"
    >
      <div className="flex flex-col h-96">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Array.isArray(messages) ? messages.map((message) => {
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
          }) : null}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isConversationActive ? (
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
        ) : (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="text-center text-gray-500">
              <span className="text-sm">Cuộc trò chuyện đã kết thúc</span>
            </div>
          </div>
        )}
      </div>

      {/* End Conversation Confirmation Dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Kết thúc cuộc trò chuyện
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc chắn muốn kết thúc cuộc trò chuyện với {otherUser.name}? 
              Hành động này không thể hoàn tác.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do kết thúc (tùy chọn)
              </label>
              <textarea
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                placeholder="Nhập lý do kết thúc cuộc trò chuyện..."
                className="w-full h-20 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEndDialog(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleEndConversation}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Kết thúc"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ChatDialog;
