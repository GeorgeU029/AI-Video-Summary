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

  // API URL - change this to your Flask API endpoint
  const API_URL = 'http://localhost:5000/api';

  // Function to handle sending a text message
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Check if the message is related to the current video
    if (videoData && messageText.toLowerCase().includes('summary')) {
      // If we already have a summary, show it
      if (videoData.processedData.summary) {
        const aiMessage = {
          id: Date.now() + 1,
          text: videoData.processedData.summary,
          sender: "ai",
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        // If we don't have a summary but we have a transcript, get a summary
        try {
          const loadingMessage = {
            id: Date.now() + 1,
            text: "Generating summary...",
            sender: "ai",
            timestamp: new Date().toISOString()
          };
          
          setMessages(prevMessages => [...prevMessages, loadingMessage]);
          
          const response = await fetch(`${API_URL}/summarize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              transcript: videoData.processedData.transcript_text
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to generate summary');
          }
          
          const data = await response.json();
          
          // Replace the loading message with the actual summary
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const loadingIndex = updatedMessages.findIndex(msg => msg.id === loadingMessage.id);
            
            if (loadingIndex !== -1) {
              updatedMessages[loadingIndex] = {
                ...loadingMessage,
                text: data.summary
              };
            }
            
            return updatedMessages;
          });
          
          // Update video data with the summary
          setVideoData(prev => ({
            ...prev,
            processedData: {
              ...prev.processedData,
              summary: data.summary
            }
          }));
        } catch (error) {
          console.error('Error generating summary:', error);
          const errorMessage = {
            id: Date.now() + 2,
            text: "Sorry, I couldn't generate a summary at this time. Please try again later.",
            sender: "ai",
            timestamp: new Date().toISOString()
          };
          
          setMessages(prevMessages => [...prevMessages, errorMessage]);
        }
      }
    } else if (messageText.toLowerCase().includes('frame') || messageText.toLowerCase().includes('timestamp')) {
      // Show information about frames if requested
      if (videoFrames && videoFrames.length > 0) {
        const frameInfo = `I've extracted ${videoFrames.length} key frames from the video. Would you like to see them?`;
        
        const aiMessage = {
          id: Date.now() + 1,
          text: frameInfo,
          sender: "ai",
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        const aiMessage = {
          id: Date.now() + 1,
          text: "No frames have been extracted yet. Please upload a video first.",
          sender: "ai",
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      }
    } else {
      // Default response for other messages
      const aiMessage = {
        id: Date.now() + 1,
        text: getAiResponse(messageText, videoData),
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    }
  };
  
  // Function to handle file uploads
  const handleFileUpload = (fileData) => {
    // Update the state with the processed file data
    setVideoData(fileData);
    
    if (fileData.processedData && fileData.processedData.frames) {
      setVideoFrames(fileData.processedData.frames);
    }
    
    // Add user message about the upload
    const userMessage = {
      id: Date.now(),
      text: `I've uploaded "${fileData.name}" for summarization.`,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Add AI message with initial analysis
    const initialAnalysis = `I've successfully processed "${fileData.name}" (${(fileData.size / (1024 * 1024)).toFixed(2)} MB).`;
    
    const analysisDetails = [];
    
    // Add transcript info if available
    if (fileData.processedData && fileData.processedData.transcript_segments) {
      const segmentCount = fileData.processedData.transcript_segments.length;
      analysisDetails.push(`• Transcribed ${segmentCount} speech segments`);
    }
    
    // Add frame extraction info if available
    if (fileData.processedData && fileData.processedData.frames) {
      const frameCount = fileData.processedData.frames.length;
      analysisDetails.push(`• Extracted ${frameCount} key frames from the video`);
    }
    
    // Add summary availability info
    if (fileData.processedData && fileData.processedData.summary) {
      analysisDetails.push(`• Generated a detailed summary of the content`);
    }
    
    analysisDetails.push(`\nWhat would you like to know about this video? You can ask me to:
• Show you the summary
• Provide specific information about key moments
• Explain the main topics covered`);
    
    const aiMessage = {
      id: Date.now() + 1,
      text: `${initialAnalysis}\n\n${analysisDetails.join('\n')}`,
      sender: "ai",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, aiMessage]);
  };
  
  const getAiResponse = (userMessage, videoData) => {
    const lowerCaseMessage = userMessage.toLowerCase();
    
    if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
      return "Hello! I'm your video summarization assistant. Would you like to upload a video for me to analyze?";
    } else if (lowerCaseMessage.includes('thank')) {
      return "You're welcome! Let me know if you need anything else.";
    } else if (!videoData && (lowerCaseMessage.includes('summarize') || lowerCaseMessage.includes('video'))) {
      return "I'd be happy to summarize a video for you. Please click the 'Add MP4 File' button to upload your video.";
    } else if (videoData && lowerCaseMessage.includes('how') && lowerCaseMessage.includes('long')) {
      // Return info about video length if we have it
      if (videoData.processedData && videoData.processedData.transcript_segments &&
          videoData.processedData.transcript_segments.length > 0) {
        const lastSegment = videoData.processedData.transcript_segments[videoData.processedData.transcript_segments.length - 1];
        return `Your video is approximately ${lastSegment.end} in length.`;
      }
      return "I've processed your video, but I don't have exact information about its length.";
    } else if (videoData) {
      return "I've analyzed your video. Would you like to see the summary, key frames, or specific information about it?";
    } else {
      return "I'm here to help analyze and summarize videos. Would you like to upload a video file?";
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