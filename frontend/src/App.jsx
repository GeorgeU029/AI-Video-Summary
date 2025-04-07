import React from 'react';
import ChatBot from './Components/Chat/ChatBot';
import MeshNetworkBackground from './Components/Background/MeshBackground';

function App() {
  return (
    <div className='min-h-screen'>
      <MeshNetworkBackground />
      <ChatBot />
    </div>
  );
}

export default App;