import React from "react";

interface IconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5", 
  lg: "h-6 w-6"
};

// eslint-disable-next-line react-refresh/only-export-components
export const Icons = {
  // Navigation & Actions
  home: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M12 3 3 10h3v9h5v-6h2v6h5v-9h3z"/>
    </svg>
  ),
  
  users: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M16 11a4 4 0 1 0-3-6.9A6 6 0 0 1 20 10v1h-4zM8 13a4 4 0 1 0-3-6.9A6 6 0 0 1 12 12v1H8zM2 19a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2H2zM14 21v-2a7 7 0 0 1 7-7h1v9z"/>
    </svg>
  ),

  book: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M4 3h12a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3 3zM7 5v12a5 5 0 0 1 5-5h7V6a1 1 0 0 0-1-1z"/>
    </svg>
  ),

  page: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6zM14 3v5h5"/>
    </svg>
  ),

  chat: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M4 4h16v11H7l-3 3z"/>
    </svg>
  ),

  file: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16l4-4h8a2 2 0 0 0 2-2V6z"/>
    </svg>
  ),

  // CRUD Actions
  add: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
    </svg>
  ),

  edit: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M3 17.2V21h3.8l11-11L14 6.2l-11 11Z"/>
    </svg>
  ),

  delete: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M6 7h12v2H6zm2 3h8l-1 10H9L8 10Zm3-7h2l1 2h4v2H6V5h4l1-2Z"/>
    </svg>
  ),

  view: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"/>
    </svg>
  ),

  // Status & Feedback
  check: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"/>
    </svg>
  ),

  close: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
    </svg>
  ),

  search: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M10 2a8 8 0 1 1-5.3 13.9l-3.4 3.4 1.4 1.4 3.4-3.4A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/>
    </svg>
  ),

  send: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
    </svg>
  ),

  // Navigation
  chevronDown: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M7 10l5 5 5-5z"/>
    </svg>
  ),

  chevronRight: ({ className, size = "md" }: IconProps) => (
    <svg viewBox="0 0 24 24" className={`${sizeClasses[size]} ${className || ''}`}>
      <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
  ),

  // Content Types (emojis for visual distinction)
  notification: "🔔",
  upload: "📤", 
  download: "📎",
  document: "📄",
  folder: "🗂️"
};

export default Icons;
