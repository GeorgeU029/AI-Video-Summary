import React, { useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageArea from './MessageArea';
import FileModal from '../FileUpload/FileModal';

function ChatBot() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! How can I help you summarize a video today?",
      sender: "ai",
      timestamp: new Date().toISOString()
    }
  ]);
  const [videoFrames, setVideoFrames] = useState([]);
  const [videoData, setVideoData] = useState(null);

  const API_URL = 'http://localhost:5000/api';

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    // Handle summary request from processed data
    if (videoData && messageText.toLowerCase().includes('summary')) {
      if (videoData.processedData.summary) {
        const aiMessage = {
          id: Date.now() + 1,
          text: videoData.processedData.summary,
          sender: "ai",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        return;
      }

      // Else generate summary from transcript
      try {
        const loadingMessage = {
          id: Date.now() + 1,
          text: "Generating summary...",
          sender: "ai",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, loadingMessage]);

        const response = await fetch(`${API_URL}/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: videoData.processedData.transcript_text
          })
        });

        if (!response.ok) throw new Error('Failed to generate summary');
        const data = await response.json();

        setMessages(prev => {
          const updated = [...prev];
          const index = updated.findIndex(msg => msg.id === loadingMessage.id);
          if (index !== -1) {
            updated[index] = {
              ...loadingMessage,
              text: data.summary
            };
          }
          return updated;
        });

        setVideoData(prev => ({
          ...prev,
          processedData: {
            ...prev.processedData,
            summary: data.summary
          }
        }));

        return;

      } catch (error) {
        console.error('Summary error:', error);
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          text: "Sorry, I couldn't generate a summary at this time.",
          sender: "ai",
          timestamp: new Date().toISOString()
        }]);
        return;
      }
    }

    // Frame/timestamp logic
    if (messageText.toLowerCase().includes('frame') || messageText.toLowerCase().includes('timestamp')) {
      const frameInfo = videoFrames.length > 0
        ? `I've extracted ${videoFrames.length} key frames. Would you like to see them?`
        : `No frames have been extracted yet. Please upload a video first.`;

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: frameInfo,
        sender: "ai",
        timestamp: new Date().toISOString()
      }]);

      return;
    }

    // 🤖 Send to ChatGPT w/ context
    try {
      const loadingMessage = {
        id: Date.now() + 1,
        text: "Thinking...",
        sender: "ai",
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, loadingMessage]);

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: videoData?.processedData?.summary || videoData?.processedData?.transcript_text || ""
        })
      });

      const data = await response.json();

      setMessages(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(msg => msg.id === loadingMessage.id);
        if (idx !== -1) {
          updated[idx] = {
            ...loadingMessage,
            text: data.reply || "I couldn't come up with a response."
          };
        }
        return updated;
      });

    } catch (error) {
      console.error('ChatGPT error:', error);
      const errorMessage = {
        id: Date.now() + 2,
        text: "Sorry, I couldn't respond right now. Try again later.",
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleFileUpload = (fileData) => {
    setVideoData(fileData);
    if (fileData.processedData?.frames) {
      setVideoFrames(fileData.processedData.frames);
    }

    const userMessage = {
      id: Date.now(),
      text: `I've uploaded "${fileData.name}" for summarization.`,
      sender: "user",
      timestamp: new Date().toISOString()
    };

    const details = [];
    if (fileData.processedData?.transcript_segments) {
      details.push(`• Transcribed ${fileData.processedData.transcript_segments.length} speech segments`);
    }
    if (fileData.processedData?.frames) {
      details.push(`• Extracted ${fileData.processedData.frames.length} key frames`);
    }
    if (fileData.processedData?.summary) {
      details.push(`• Generated a detailed summary`);
    }
    details.push(`\nAsk me to:\n• Show the summary\n• Key moments\n• Main topics`);

    const aiMessage = {
      id: Date.now() + 1,
      text: `Processed "${fileData.name}" (${(fileData.size / (1024 * 1024)).toFixed(2)} MB)\n\n${details.join('\n')}`,
      sender: "ai",
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
  };

  return (
    <div className="flex flex-col h-screen items-center justify-between p-3">
      <ChatHeader />
      <div className="w-full max-w-4xl flex-grow flex flex-col pb-4">
        <MessageArea messages={messages} />
        <MessageInput 
          onSendMessage={handleSendMessage} 
          onAttachmentClick={() => setIsModalOpen(true)}
        />
      </div>

      <FileModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}

export default ChatBot;
