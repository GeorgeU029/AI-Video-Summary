import React from 'react';
import Logo from '../Logo';
import ReactMarkdown from 'react-markdown';

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
        <div className={`${isUser ? 'text-white' : 'text-gray-700'} markdown-content`}>
          {isUser ? (
            <div className="whitespace-pre-line">{text}</div>
          ) : (
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold my-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold my-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-md font-bold my-2" {...props} />,
                h4: ({ node, ...props }) => <h4 className="text-base font-bold my-1" {...props} />,
                p: ({ node, ...props }) => <p className="my-1" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                li: ({ node, ...props }) => <li className="my-1" {...props} />,
                a: ({ node, ...props }) => <a className="text-blue-600 underline" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-3 my-2 italic" {...props} />,
                code: ({ node, ...props }) => <code className="bg-gray-100 px-1 rounded" {...props} />,
                pre: ({ node, ...props }) => <pre className="bg-gray-100 p-2 rounded my-2 overflow-x-auto" {...props} />
              }}
            >
              {text}
            </ReactMarkdown>
          )}
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