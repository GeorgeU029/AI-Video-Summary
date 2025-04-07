import React, { useRef, useEffect, useState } from 'react';
import Message from './Message';

function MessageArea({ messages = [] }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [fadeIn, setFadeIn] = useState({});
  
  // Handle initial scroll and new messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      setFadeIn({
        [lastMessage.id]: true
      });
      
      setTimeout(() => {
        setFadeIn(prev => ({
          ...prev,
          [lastMessage.id]: false
        }));
      }, 500);
    }
    
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 50);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end" 
      });
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-lg p-4 mb-4 h-[60vh] bg-white/30 backdrop-blur-sm shadow-sm">
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto no-scrollbar px-2 py-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start a conversation by sending a message below</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`transition-all duration-300 ${
                    fadeIn[message.id] 
                      ? 'opacity-0 translate-y-4 animate-message-appear' 
                      : 'opacity-100'
                  }`}
                >
                  <Message
                    text={message.text}
                    sender={message.sender}
                    timestamp={message.timestamp}
                  />
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-6 right-6 bg-blue-500 text-white p-2 rounded-full shadow-md hover:bg-blue-600 transition-all animate-fade-in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default MessageArea;