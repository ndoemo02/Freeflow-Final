import React, { useEffect, useRef } from 'react';

interface Message {
  speaker: 'user' | 'agent';
  text: string;
}

interface ChatHistoryProps {
  messages: Message[];
}

export default function ChatHistory({ messages }: ChatHistoryProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl h-48 overflow-y-auto p-4 space-y-4 mb-4 rounded-xl bg-slate-800/20 border border-slate-600/20">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-end gap-2 ${
            msg.speaker === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {msg.speaker === 'agent' && (
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-lg flex-shrink-0">
              🤖
            </div>
          )}
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              msg.speaker === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-slate-700 text-slate-200 rounded-bl-none'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
}