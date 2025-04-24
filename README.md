# AI Video Summarizer

An intelligent web application that analyzes video content, generates transcripts, and produces concise AI-powered summaries to save you time.

## Features

- **Video Upload**: Supports MP4, AVI, MOV, and MKV formats
- **Automatic Transcription**: Uses OpenAI Whisper for local speech-to-text conversion
- **AI Summarization**: Leverages ChatGPT to create concise, comprehensive summaries
- **Chat Interface**: Allows users to ask questions about the video content
- **Responsive Design**: Works on desktop and mobile devices

## Project Architecture

### Backend (Flask)
- Local Whisper model for speech-to-text
- OpenAI GPT integration for summarization
- RESTful API endpoints for video processing

### Frontend (React)
- Modern React with hooks
- Tailwind CSS for styling
- Responsive chat interface
- File upload with drag-and-drop support

## Getting Started

### Prerequisites

- Python 3.8+ 
- Node.js 16+
- FFmpeg installed on your system
- OpenAI API Key

### Installation

#### Backend Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ai-video-summarizer.git
   cd ai-video-summarizer
   ```

2. Set up Python virtual environment
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. Install backend dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   WHISPER_MODEL=base  # Options: base, small, medium, large
   OPENAI_MODEL=gpt-3.5-turbo  # Or gpt-4 if you have access
   FFMPEG_PATH=/path/to/ffmpeg  # Only needed if FFmpeg is not in PATH
   ALLOWED_ORIGINS=http://localhost:5173  # Frontend URL
   ```

#### Frontend Setup

1. Navigate to the frontend directory
   ```bash
   cd frontend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

### Running the Application

1. Start the backend (from the root directory with virtual environment activated)
   ```bash
   cd backend
   python app.py
   ```

2. Start the frontend (in a separate terminal)
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and go to `http://localhost:5173`

## API Endpoints

The backend provides several RESTful endpoints:

| Endpoint         | Method | Description                               |
|------------------|--------|-------------------------------------------|
| `/api/upload`    | POST   | Upload a video file                       |
| `/api/process`   | POST   | Process the uploaded video                |
| `/api/summary`   | POST   | Generate or retrieve a summary            |
| `/api/chat`      | POST   | Chat with AI about the video content      |
| `/api/videos`    | GET    | List all processed videos                 |

## Project Structure

```
/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── uploads/            # Temporary storage for uploaded videos
│   └── processed/          # Storage for processed transcripts and summaries
│
└── frontend/
    ├── src/
    │   ├── Components/     # React components
    │   │   ├── Background/
    │   │   ├── Chat/
    │   │   ├── FileUpload/
    │   │   └── Logo.jsx
    │   ├── App.jsx         # Main application component
    │   └── main.jsx        # Application entry point
    ├── index.html          # HTML template
    └── package.json        # Frontend dependencies
```

## Usage

1. Upload a video using the "Add Video" button
2. Wait for the video to be processed (transcription)
3. Ask the AI to generate a summary
4. Chat with the AI about the video content
5. Request the transcript if needed

## Customization

### Whisper Model Size

You can change the Whisper model size in the `.env` file. Options include:
- `base`: Fastest, lowest accuracy
- `small`: Good balance of speed and accuracy
- `medium`: Better accuracy, slower
- `large`: Best accuracy, slowest

### OpenAI Model

You can switch between different OpenAI models by changing the `OPENAI_MODEL` in the `.env` file.

## Limitations

- Video file size is limited to 500MB by default (configurable)
- Processing time depends on video length and Whisper model size
- Summarization quality depends on the transcript quality

## Future Improvements

- [ ] User authentication system
- [ ] Saved history of processed videos
- [ ] Multiple language support
- [ ] Keyword extraction and timestamp linking
- [ ] Video chapter generation

## Acknowledgements

- [OpenAI Whisper](https://github.com/openai/whisper) for speech recognition
- [OpenAI ChatGPT API](https://platform.openai.com/) for AI-powered summarization
- [Flask](https://flask.palletsprojects.com/) for the backend API
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
