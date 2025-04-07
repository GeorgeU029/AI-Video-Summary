import React from 'react';
import Logo from '../Logo';

function Message({ text, sender, timestamp }) {
  const isUser = sender === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex-shrink-0">
          <Logo size="sm" showTooltip={false} showText={false} />
        </div>
      )}
      <div className={`max-w-[75%] break-words rounded-lg px-4 py-3 ${
        isUser 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none shadow-md' 
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-md'
      }`}>
        <div className="flex items-center mb-1">
          <div className={`font-medium ${isUser ? 'text-blue-100' : 'text-blue-600'}`}>
            {isUser ? 'You' : 'FrameSage AI'}
          </div>
          {timestamp && (
            <div className={`text-xs ml-2 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <div className={`${isUser ? 'text-white' : 'text-gray-700'} whitespace-pre-line`}>
          {text}
        </div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
          <span className="text-lg">😎</span>
        </div>
      )}
    </div>
  );
}

export default Message;