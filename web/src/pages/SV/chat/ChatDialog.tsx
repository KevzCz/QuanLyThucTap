import React, { useState, useRef, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { ChatConversation, ChatMessage, ChatUser } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import { socketManager } from "../../../services/socketManager";
import dayjs from "dayjs";
import { chatAPI } from "../../../services/chatApi";
import { useToast } from "../../../components/UI/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: ChatConversation | null;
  currentUser: ChatUser;
}

const ChatDialog: React.FC<Props> = ({ open, onClose, conversation, currentUser }) => {
  const { showError } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      if (!conversation?.id) return;

      try {
        const response = await chatAPI.getMessages(conversation.id);
        
        // Transform API messages to local format
        const transformedMessages: ChatMessage[] = response.map(msg => ({
          id: msg.messageId,
          senderId: msg.senderId,
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.type as "text" | "file" | "system",
          fileName: msg.attachment?.originalName,
          fileUrl: msg.attachment?.fileUrl,
          fileSize: msg.attachment?.fileSize,
          mimeType: msg.attachment?.mimeType,
        }));
        
        setMessages(transformedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
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
      const message = args[0] as ChatMessage & { messageId?: string; createdAt?: string; attachment?: { originalName?: string; fileUrl?: string; fileSize?: number; mimeType?: string } };
      // Only add message if it's for this conversation
      if (message) {
        const transformedMessage = {
          id: message.messageId || message.id,
          senderId: message.senderId,
          content: message.content,
          timestamp: message.createdAt || message.timestamp,
          type: message.type as "text" | "file" | "system",
          fileName: message.attachment?.originalName,
          fileUrl: message.attachment?.fileUrl,
          fileSize: message.attachment?.fileSize,
          mimeType: message.attachment?.mimeType,
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

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews = new Map(filePreviews);

    fileArray.forEach(file => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError(`${file.name}: Kích thước file không được vượt quá 10MB`);
        return;
      }

      validFiles.push(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.set(file.name, reader.result as string);
          setFilePreviews(new Map(newPreviews));
        };
        reader.readAsDataURL(file);
      }
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setFilePreviews(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !conversation) return;

    const messageContent = newMessage.trim();
    const filesToSend = [...selectedFiles];
    
    // Clear input immediately for better UX
    setNewMessage("");
    setSelectedFiles([]);
    setFilePreviews(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      // If there's a text message, send it first
      if (messageContent) {
        await chatAPI.sendMessage(conversation.id, {
          content: messageContent,
          type: 'text',
        });
      }

      // Then send each file as a separate message
      for (const file of filesToSend) {
        await chatAPI.sendMessage(conversation.id, {
          content: `[File: ${file.name}]`,
          type: 'file',
          attachment: file,
        });
      }

      // Note: We don't manually add the message here
      // The Socket.IO 'newMessage' listener will add it automatically
    } catch {
      // Restore message and files on error
      setNewMessage(messageContent);
      setSelectedFiles(filesToSend);
      // Recreate previews
      const newPreviews = new Map<string, string>();
      filesToSend.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews.set(file.name, reader.result as string);
            setFilePreviews(new Map(newPreviews));
          };
          reader.readAsDataURL(file);
        }
      });
      showError("Không thể gửi tin nhắn. Vui lòng thử lại.");
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
                    {message.type === 'file' && message.fileName && message.fileUrl ? (
                      <div className="space-y-2">
                        {message.mimeType?.startsWith('image/') ? (
                          <img 
                            src={message.fileUrl} 
                            alt={message.fileName}
                            className="max-w-xs rounded-lg cursor-pointer"
                            onClick={() => window.open(message.fileUrl, '_blank')}
                          />
                        ) : (
                          <a 
                            href={message.fileUrl}
                            download={message.fileName}
                            className={`flex items-center gap-2 p-2 rounded ${isOwn ? 'bg-blue-500' : 'bg-white'}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5">
                              <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{message.fileName}</div>
                              <div className="text-xs opacity-75">{((message.fileSize || 0) / 1024).toFixed(1)} KB</div>
                            </div>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    )}
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
          {/* File Previews */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 space-y-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file) => (
                <div key={file.name} className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
                  {filePreviews.has(file.name) ? (
                    <img 
                      src={filePreviews.get(file.name)} 
                      alt="Preview" 
                      className="w-10 h-10 object-cover rounded" 
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-500">
                        <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.name)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0"
                    title="Xóa file"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4">
                      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              multiple
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Đính kèm file (Ctrl+V để dán)"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              placeholder="Nhập tin nhắn hoặc dán ảnh (Ctrl+V)..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && selectedFiles.length === 0}
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
