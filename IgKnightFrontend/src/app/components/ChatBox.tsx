import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { MessageCircle, Send, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export interface ChatMessage {
  id?: number;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  currentUserId: number;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  chatConnected?: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ 
  messages, 
  currentUserId, 
  onSendMessage,
  disabled = false,
  chatConnected = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmedMessage = inputValue.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#141B2D]">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
            <h3 className="text-white font-semibold text-xs tracking-wide">CHAT</h3>
          </div>
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1.5">
            {chatConnected ? (
              <>
                <Wifi className="w-3 h-3 text-green-500" />
                <span className="text-[10px] text-green-500 font-mono">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 font-mono">Offline</span>
              </>
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <p className="text-slate-500 text-[10px] mt-1 font-mono">{messages.length} messages</p>
        )}
      </div>

      {/* Messages List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-lg bg-slate-800/30 flex items-center justify-center mb-2">
                <MessageCircle className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-500 text-xs font-medium">No messages yet</p>
              <p className="text-slate-600 text-[10px] mt-1">Say hello to your opponent!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isCurrentUser = msg.userId === currentUserId;
                // Create unique key from multiple fields to avoid duplicates
                const uniqueKey = msg.id ? `${msg.id}-${msg.timestamp}` : `temp-${index}-${msg.timestamp}`;
                return (
                  <div
                    key={uniqueKey}
                    className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className={`text-[10px] font-medium ${
                        isCurrentUser ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        {isCurrentUser ? 'You' : (msg.username || `User ${msg.userId}`)}
                      </span>
                      <span className="text-[9px] text-slate-600">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`
                        max-w-[85%] px-3 py-2 rounded-lg text-xs break-words
                        ${isCurrentUser 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-slate-800/60 text-slate-200 rounded-bl-sm'
                        }
                      `}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-800/50 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? 'Chat disabled' : 'Type a message...'}
            disabled={disabled}
            maxLength={500}
            className="
              flex-1 px-3 py-2 text-xs rounded-lg
              bg-slate-800/40 text-white placeholder-slate-500
              border border-slate-700/50
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
          />
          <Button
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            size="sm"
            className="
              px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all flex items-center gap-1
            "
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[9px] text-slate-600 mt-1.5">
          Press Enter to send • {inputValue.length}/500
        </p>
      </div>
    </div>
  );
};
