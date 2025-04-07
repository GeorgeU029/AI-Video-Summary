import React, { useState } from "react";
import Logo from "../Logo";

function ChatHeader() {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  return (
    <div className="flex justify-between items-center w-full py-3 px-7">
      <Logo size="md"></Logo>
      <div className="relative">
        <button
          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium"
          onMouseEnter={() => setIsTooltipVisible(true)}
          onMouseLeave={() => setIsTooltipVisible(false)}
        >
          AI Video Summarizer
        </button>
        
        {isTooltipVisible && (
          <div className="absolute right-0 mt-2 w-64 bg-white p-3 rounded-lg shadow-lg border border-blue-100 z-10 animate-fade-in">
            <div className="absolute -top-2 right-4 w-4 h-4 bg-white transform rotate-45 border-t border-l border-blue-100"></div>
            <p className="text-sm text-gray-700">
              Upload any video and our AI will create a concise summary of the content, saving you time and highlighting key points.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatHeader;