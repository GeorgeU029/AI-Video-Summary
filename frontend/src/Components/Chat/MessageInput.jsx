import React, { useState, useRef, useEffect } from "react";

function MessageInput({ onSendMessage, onAttachmentClick }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  const maxCharacters = 500;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + "px";
    }
  }, [message]);

  const handleChange = (e) => {
    const input = e.target.value;
    if (input.length <= maxCharacters) {
      setMessage(input);
    } else {
      setMessage(input.slice(0, maxCharacters));
    }
  };

  const handleSubmit = () => {
    if (message.trim() && message.length <= maxCharacters) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const remainingChars = maxCharacters - message.length;
  const isNearLimit = remainingChars <= 50 && remainingChars > 0;
  const isAtLimit = remainingChars <= 0;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-5 rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 w-full max-w-4xl mx-auto transition-all duration-200 backdrop-blur-sm shadow-sm">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`w-full p-1 border-0 focus:outline-none appearance-none rounded-lg resize-none overflow-y-auto no-scrollbar 
        text-gray-900 placeholder-transition-all duration-200
        ${isAtLimit ? "border-2 border-red-500" : ""}`}
        placeholder="Type your message..."
        style={{
          maxHeight: "150px",
          minHeight: "50px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <button
          onClick={onAttachmentClick}
          className="flex items-center gap-1 py-2 px-3 text-sm rounded-lg cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100
            shadow transition-all duration-200 hover:shadow-md font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add MP4 File
        </button>
        <button
          onClick={handleSubmit}
          disabled={isAtLimit || message.trim().length === 0}
          className={`flex items-center gap-1 py-2 px-4 text-sm rounded-lg cursor-pointer
                    transition-all duration-200 shadow font-medium
                    ${
                      isAtLimit || message.trim().length === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-md"
                    }`}
        >
          Send
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <p className={`text-xs ${isNearLimit ? "text-yellow-800 font-medium" : "text-blue-50"} ${
        isAtLimit ? "text-red-800 font-bold" : ""
      }`}>
        {message.length}/{maxCharacters} characters
        {isAtLimit && " - Maximum limit reached"}
      </p>
    </div>
  );
}

export default MessageInput;