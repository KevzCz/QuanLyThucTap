import React, { useState, useRef, useEffect } from "react";
import Modal from "../../../util/Modal";
import type { ChatConversation, ChatMessage, ChatUser } from "../../PDT/chat/ChatTypes";
import { roleLabel, roleColor } from "../../PDT/chat/ChatTypes";
import { chatAPI } from "../../../services/chatApi";
import { socketManager } from "../../../services/socketManager";
import { useToast } from "../../../components/UI/Toast";
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showError } = useToast();

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
            id: msg.messageId || msg.id,
            senderId: msg.senderId,
            content: msg.content,
            timestamp: msg.createdAt || msg.timestamp,
            type: msg.type as "text" | "file" | "system",
            fileName: (msg.attachment as { originalName?: string })?.originalName,
            fileUrl: (msg.attachment as { fileUrl?: string })?.fileUrl,
            fileSize: (msg.attachment as { fileSize?: number })?.fileSize,
            mimeType: (msg.attachment as { mimeType?: string })?.mimeType,
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
      if (file.size > 10 * 1024 * 1024) {
        showError("File quá lớn", `${file.name}: Kích thước file không được vượt quá 10MB`);
        return;
      }

      validFiles.push(file);

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
    
    setNewMessage("");
    setSelectedFiles([]);
    setFilePreviews(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // If there's a text message, send it first
      if (messageContent) {
        const formData = new FormData();
        formData.append('content', messageContent);
        formData.append('type', 'text');

        const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversation.id}/messages`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      }

      // Then send each file as a separate message
      for (const file of filesToSend) {
        const formData = new FormData();
        formData.append('content', `[File: ${file.name}]`);
        formData.append('type', 'file');
        formData.append('attachment', file);

        const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversation.id}/messages`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      }
    } catch {
      setNewMessage(messageContent);
      setSelectedFiles(filesToSend);
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
          {isConversationActive && currentUser.role === 'ban-chu-nhiem' && (
            <div className="relative">
              <button
                onClick={() => setShowEndDialog(!showEndDialog)}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                title="Kết thúc cuộc trò chuyện"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Kết thúc</span>
              </button>
              
              {showEndDialog && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Kết thúc cuộc trò chuyện
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Bạn có chắc chắn muốn kết thúc cuộc trò chuyện với {otherUser.name}?
                  </p>
                  
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Lý do kết thúc (tùy chọn)
                    </label>
                    <textarea
                      value={endReason}
                      onChange={(e) => setEndReason(e.target.value)}
                      placeholder="Nhập lý do..."
                      className="w-full h-16 border border-gray-300 rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowEndDialog(false)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleEndConversation}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? "Đang xử lý..." : "Kết thúc"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      }
      widthClass="max-w-2xl"
    >
      <div className="flex flex-col h-[500px] sm:h-96">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 touch-manipulation">
          {messages.map((message) => {
            const isOwn = message.senderId === currentUser.id;
            const sender = isOwn ? currentUser : otherUser;
            
            return (
              <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2 sm:gap-2.5 max-w-[85%] sm:max-w-xs ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-xs">
                      {sender?.name.charAt(0)}
                    </span>
                  </div>
                  <div className={`rounded-lg px-3 sm:px-3 py-2.5 sm:py-2 ${
                    isOwn 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    {message.content && !message.content.startsWith('[File:') && (
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    )}
                    {message.fileName && (
                      <div className={message.content && !message.content.startsWith('[File:') ? "mt-2" : ""}>
                        {message.mimeType?.startsWith('image/') ? (
                          <img 
                            src={message.fileUrl} 
                            alt={message.fileName}
                            className="max-w-full rounded cursor-pointer"
                            onClick={() => window.open(message.fileUrl, '_blank')}
                          />
                        ) : (
                          <a 
                            href={message.fileUrl} 
                            download={message.fileName}
                            className={`flex items-center gap-2 p-2 rounded ${
                              isOwn ? 'bg-blue-700' : 'bg-gray-200'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H8z" />
                            </svg>
                            <div className="text-xs">
                              <div className="font-medium">{message.fileName}</div>
                              <div className={isOwn ? 'text-blue-200' : 'text-gray-500'}>
                                {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : ''}
                              </div>
                            </div>
                          </a>
                        )}
                      </div>
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
        {isConversationActive ? (
          <div className="border-t border-gray-200 p-3 sm:p-4">
            {selectedFiles.length > 0 && (
              <div className="mb-3 space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file) => (
                  <div key={file.name} className="p-2.5 sm:p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
                    {filePreviews.has(file.name) ? (
                      <img 
                        src={filePreviews.get(file.name)} 
                        alt="Preview" 
                        className="w-12 h-12 sm:w-10 sm:h-10 object-cover rounded" 
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-5 sm:w-5 text-gray-500">
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
                      className="p-1.5 sm:p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0 touch-manipulation"
                      title="Xóa file"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-4 sm:w-4">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                multiple
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2.5 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg touch-manipulation"
                title="Đính kèm tệp (Ctrl+V để dán)"
              >
                📎
              </button>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                onPaste={handlePaste}
                placeholder="Nhập tin nhắn hoặc dán ảnh (Ctrl+V)..."
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-h-[44px] sm:min-h-[38px]"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && selectedFiles.length === 0}
                className="px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-4 sm:w-4">
                  <path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
            <div className="text-center text-gray-500">
              <span className="text-sm">Cuộc trò chuyện đã kết thúc</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ChatDialog;
