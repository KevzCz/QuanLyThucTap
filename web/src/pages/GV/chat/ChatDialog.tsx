import React, { useState, useRef, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { ChatConversation, ChatMessage, ChatUser } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import { socketManager } from "../../../services/socketManager";
import dayjs from "dayjs";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: ChatConversation | null;
  currentUser: ChatUser;
}


const ChatDialog: React.FC<Props> = ({ open, onClose, conversation, currentUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
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

    // Create optimistic message for UI
    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderId: currentUser.id,
      content: messageContent,
      timestamp: new Date().toISOString(),
      type: "text",
    };

    // Add optimistic message to UI
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Send message to server
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

      if (response.ok) {
        const responseData = await response.json();
        // Replace optimistic message with server response
        if (responseData.success && responseData.data) {
          const serverMessage = {
            ...responseData.data,
            id: responseData.data.messageId || responseData.data.id,
            timestamp: responseData.data.createdAt || responseData.data.timestamp
          };
          setMessages(prev => 
            prev.map(msg => msg.id === optimisticMessage.id ? serverMessage : msg)
          );
        }
      } else {
        console.error('Failed to send message');
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        // Restore message content to input
        setNewMessage(messageContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      // Restore message content to input
      setNewMessage(messageContent);
    }
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
