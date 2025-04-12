import React, { useState, useRef, useEffect } from "react";

function MessageInput({ onSendMessage, onAttachmentClick, disabled = false }) {
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
    if (message.trim() && message.length <= maxCharacters && !disabled) {
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
    <div className={`flex flex-col gap-3 p-3 sm:p-5 rounded-xl 
      ${disabled 
        ? 'bg-gradient-to-r from-blue-300/80 to-blue-400/80 opacity-90' 
        : 'bg-gradient-to-r from-blue-400 to-blue-500'
      } 
      w-full max-w-4xl mx-auto transition-all duration-200 backdrop-blur-sm shadow-sm`}>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full p-3 border-0 focus:outline-none appearance-none rounded-lg resize-none overflow-y-auto no-scrollbar 
        text-gray-900 placeholder-transition-all duration-200
        ${isAtLimit ? "border-2 border-red-500" : ""}
        ${disabled ? "bg-gray-100 text-gray-500" : ""}`}
        placeholder={disabled ? "Processing video... please wait" : "Type your message..."}
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
          disabled={disabled}
          className={`flex items-center gap-1 py-2 px-3 text-sm rounded-lg cursor-pointer 
            shadow transition-all duration-200 font-medium
            ${disabled 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-md'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Video
        </button>
        <button
          onClick={handleSubmit}
          disabled={isAtLimit || message.trim().length === 0 || disabled}
          className={`flex items-center gap-1 py-2 px-4 text-sm rounded-lg
                    transition-all duration-200 shadow font-medium
                    ${
                      isAtLimit || message.trim().length === 0 || disabled
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-md cursor-pointer"
                    }`}
        >
          Send
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      {disabled ? (
        <div className="text-white text-xs flex items-center animate-pulse">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing video... please wait
        </div>
      ) : (
        <p className={`text-xs ${isNearLimit ? "text-yellow-800 font-medium" : "text-blue-50"} ${
          isAtLimit ? "text-red-800 font-bold" : ""
        }`}>
          {message.length}/{maxCharacters} characters
          {isAtLimit && " - Maximum limit reached"}
        </p>
      )}
    </div>
  );
}

export default MessageInput;