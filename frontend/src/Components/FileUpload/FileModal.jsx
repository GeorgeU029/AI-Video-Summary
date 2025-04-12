import React, { useState, useRef } from 'react';
import Logo from '../Logo';

function FileModal({ isOpen, onClose, onFileUpload }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  // API URL - update this to point to your local server
  const API_URL = 'http://localhost:5000/api';

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop events
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Clear any previous errors
    setErrorMessage('');
    
    // Check for valid video formats
    const validFormats = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska'];
    if (validFormats.includes(file.type) || 
        file.name.endsWith('.mp4') || 
        file.name.endsWith('.avi') || 
        file.name.endsWith('.mov') || 
        file.name.endsWith('.mkv')) {
      setSelectedFile(file);
    } else {
      setErrorMessage('Please select a valid video file (MP4, AVI, MOV, or MKV)');
    }
  };

  // Trigger file input click
  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Handle file upload to API
  const uploadFile = async () => {
    if (!selectedFile) return;
    
    // Clear any previous errors
    setErrorMessage('');
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // STEP 1: Upload the file
      setUploadProgress(10);
      console.log('Uploading file to:', `${API_URL}/upload`);
      
      // Create FormData object with the exact parameter name expected by the server
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Use XMLHttpRequest for better upload progress tracking and debugging
      const xhr = new XMLHttpRequest();
      
      // Set up upload progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete < 90 ? percentComplete : 90);
        }
      });
      
      // Create a promise to handle the XHR request
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${xhr.responseText}`));
            }
          } else {
            reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Network error during upload'));
        };
      });
      
      // Open and send the request
      xhr.open('POST', `${API_URL}/upload`, true);
      xhr.send(formData);
      
      // Wait for the upload to complete
      const uploadData = await uploadPromise;
      console.log('Upload success:', uploadData);
      
      // Extract the filename from the response
      if (!uploadData.filename) {
        throw new Error('Server did not return a filename');
      }
      
      const serverFilename = uploadData.filename;
      
      // STEP 2: Process the uploaded file
      setUploadProgress(95);
      console.log('Processing file:', serverFilename);
      
      const processResponse = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: serverFilename
        })
      });

      // Handle processing errors
      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        throw new Error(`Processing failed (${processResponse.status}): ${errorText}`);
      }

      const processData = await processResponse.json();
      console.log('Process success:', processData);
      setUploadProgress(100);
      
      // Call onFileUpload with the data
      onFileUpload({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        processedData: processData,
        filename: serverFilename // Store the server filename for later use
      });
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error processing video:', error);
      setErrorMessage(error.message);
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Close modal when clicking outside
  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300"
      onClick={handleOutsideClick}
    >
      <div className="absolute inset-0 bg-blue-900/20"></div>
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all relative z-10">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo size="sm" showTooltip={false} />
            <h3 className="text-white font-bold text-lg">Upload Video</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-blue-600 rounded-full p-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              <p className="font-bold">Error</p>
              <p>{errorMessage}</p>
            </div>
          )}
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            } transition-colors duration-200`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-800">{selectedFile.name}</h4>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Change file
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 mb-4 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Drag & Drop your video here
                </h3>
                <p className="text-gray-500 mb-4">
                  or click to browse your files
                </p>
                <button
                  type="button"
                  onClick={onButtonClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*,.mp4,.avi,.mov,.mkv"
                  onChange={handleChange}
                />
                <p className="mt-4 text-xs text-gray-400">
                  Supported formats: MP4, AVI, MOV, MKV
                </p>
              </>
            )}
          </div>
        </div>
        
        {isLoading && (
          <div className="px-6 py-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              {uploadProgress < 50 ? 'Uploading video...' : 'Processing video...'}
            </p>
          </div>
        )}
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={uploadFile}
            disabled={!selectedFile || isLoading}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white 
              ${!selectedFile || isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              } transition-colors`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {uploadProgress < 50 ? 'Uploading...' : 'Processing...'}
              </span>
            ) : (
              'Upload Video'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileModal;