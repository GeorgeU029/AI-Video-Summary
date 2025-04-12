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
  const [isProcessing, setIsProcessing] = useState(false);

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

        // FIXED: Changed from /summarize to /summary and updated request body
        const response = await fetch(`${API_URL}/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: videoData.filename || videoData.processedData.filename
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

    // Command to show transcript
    if (messageText.toLowerCase().includes('transcript') && videoData?.processedData?.transcript_text) {
      const transcript = videoData.processedData.transcript_text;
      const truncatedTranscript = transcript.length > 1000 
        ? transcript.substring(0, 1000) + "...\n\n(Transcript truncated for readability)" 
        : transcript;
      
      const aiMessage = {
        id: Date.now() + 1,
        text: "## Video Transcript\n\n" + truncatedTranscript,
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      return;
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

  // UPDATED: handleFileUpload to receive processed data from FileModal
  const handleFileUpload = async (processedFileData) => {
    // Close the modal immediately
    setIsModalOpen(false);
    
    // Add a processing message to the chat
    const processingId = Date.now();
    const userMessageId = processingId - 1;
    
    // Add user message showing upload
    setMessages(prev => [...prev, {
      id: userMessageId,
      text: `I've uploaded "${processedFileData.name}" for summarization.`,
      sender: "user",
      timestamp: new Date().toISOString()
    }]);
    
    // Add success message
    // Build success message with proper formatting
    let details = [];
    
    if (processedFileData.processedData?.transcript_text) {
      const wordCount = processedFileData.processedData.transcript_text.split(/\s+/).length;
      details.push(`• Transcribed approximately ${wordCount} words`);
    }
    
    if (processedFileData.processedData?.frames) {
      details.push(`• Extracted ${processedFileData.processedData.frames.length} key frames`);
    }

    const successMessage = [
      `## Video Processing Complete`,
      ``,
      `I've successfully processed "${processedFileData.name}" (${(processedFileData.size / (1024 * 1024)).toFixed(2)} MB).`,
      ``,
      ...details,
      ``,
      `### What would you like to do next?`,
      ``,
      `• Generate a summary`,
      ``,
      `• Show the transcript`,
      ``,
      `• Ask questions about the content`
    ].join('\n');

    // Add the success message to chat
    setMessages(prev => [...prev, {
      id: processingId,
      text: successMessage,
      sender: "ai",
      timestamp: new Date().toISOString()
    }]);
    
    // Save the data
    setVideoData(processedFileData);
    
    if (processedFileData.processedData?.frames) {
      setVideoFrames(processedFileData.processedData.frames);
    }
  };

  return (
    <div className="flex flex-col h-screen items-center justify-between p-3">
      <ChatHeader />
      <div className="w-full max-w-4xl flex-grow flex flex-col pb-4">
        <MessageArea messages={messages} />
        <MessageInput 
          onSendMessage={handleSendMessage} 
          onAttachmentClick={() => setIsModalOpen(true)}
          disabled={isProcessing}
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