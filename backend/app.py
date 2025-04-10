from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import numpy as np
import cv2
import whisper
import datetime
from openai import OpenAI
import uuid
import logging
from werkzeug.utils import secure_filename
import pathlib

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define paths for file storage
UPLOAD_FOLDER = 'uploads/'
FRAMES_DIR = 'frames/'
OUTPUT_DIR = 'processed/'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

# Ensure directories exist
for directory in [UPLOAD_FOLDER, FRAMES_DIR, OUTPUT_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

# Set maximum content length for file uploads (500MB)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_dir(path):
    try:
        if not os.path.exists(path):
             os.makedirs(path)
    except OSError:
        logger.error(f"Error: creating directory with name {path}")
        return False
    return True

def save_frame(video_path, save_dir, gap=10):
    name = os.path.basename(video_path).split(".")[0]
    save_path = os.path.join(save_dir, name)
    create_dir(save_path)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Error: Could not open video file: {video_path}")
        return None, []

    idx = 0
    fps = cap.get(cv2.CAP_PROP_FPS)  # Get frames per second

    logger.info(f"Processing video: {name}")
    logger.info(f"FPS: {fps}")

    extracted_frames = []

    while True:
        ret, frame = cap.read()

        if not ret:
            cap.release()
            break

        # Calculate timestamp in seconds
        timestamp_seconds = idx / fps
        # Format timestamp as HH:MM:SS
        hours = int(timestamp_seconds // 3600)
        minutes = int((timestamp_seconds % 3600) // 60)
        seconds = int(timestamp_seconds % 60)
        timestamp = f"{hours:02d}_{minutes:02d}_{seconds:02d}"

        if idx == 0 or idx % gap == 0:
            frame_path = f"{save_path}/frame_{timestamp}.png"
            cv2.imwrite(frame_path, frame)

            # Create URL path for frontend
            relative_path = os.path.relpath(frame_path, start='.')
            extracted_frames.append({
                "path": relative_path,
                "timestamp": timestamp,
                "seconds": timestamp_seconds
            })

            if idx % 100 == 0:
                logger.info(f"Saved frame at {timestamp} ({idx} frames processed)")

        idx += 1

    logger.info(f"Completed processing {name}: {idx} total frames, saved frames at every {gap} frames")
    return save_path, extracted_frames

def format_timestamp(seconds):
    return str(datetime.timedelta(seconds=seconds)).split('.')[0]

def transcribe_video(video_path):
    # Load the model
    model = whisper.load_model('base')

    # Transcribe the audio with timestamps
    logger.info(f"Transcribing {video_path}...")
    result = model.transcribe(video_path, fp16=False)

    # Format the output
    transcript_segments = []
    transcript_text = ""

    for segment in result["segments"]:
        start_time = format_timestamp(segment['start'])
        end_time = format_timestamp(segment['end'])
        text = segment['text']

        transcript_text += f"[{start_time} --> {end_time}] {text}\n\n"
        transcript_segments.append({
            "start": start_time,
            "end": end_time,
            "start_seconds": segment['start'],
            "end_seconds": segment['end'],
            "text": text
        })

    # Save to a file
    video_filename = os.path.basename(video_path)
    output_filename = f"{OUTPUT_DIR}{video_filename.split('.')[0]}_transcript.txt"
    with open(output_filename, "w") as f:
        f.write(transcript_text)

    return transcript_segments, transcript_text, output_filename

def summarize_transcript(transcript_text):
    try:
        # Use hardcoded API key
        api_key = ""  # PUT THE KEY HERE
        client = OpenAI(api_key=api_key)

        # Create the completion request for summarization
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes educational content."},
                {"role": "user", "content": f"Please summarize the following lecture transcript in bullet points, organized by main topics:\n\n{transcript_text}"}
            ]
        )

        summary = completion.choices[0].message.content
        return summary
    except Exception as e:
        logger.error(f"Error in summarizing transcript: {e}")
        return None

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'status': 'success',
        'message': 'Study Buddy API is running!',
        'endpoints': [
            '/api/test - Test API connection',
            '/api/upload - Upload video files (POST only)',
            '/api/process - Process uploaded videos (POST only)',
            '/api/summarize - Generate summaries from transcripts (POST only)'
        ]
    })

# API root endpoint
@app.route('/api', methods=['GET'])
def api_root():
    return jsonify({
        'status': 'success',
        'message': 'Study Buddy API is running!',
        'endpoints': [
            '/api/test - Test API connection',
            '/api/upload - Upload video files (POST only)',
            '/api/process - Process uploaded videos (POST only)',
            '/api/summarize - Generate summaries from transcripts (POST only)'
        ]
    })

# Add a general OPTIONS route handler for all endpoints
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 200

@app.route('/api/upload', methods=['GET', 'POST', 'OPTIONS'])
def upload_video():
    # Log request information for debugging
    logger.info(f"Upload endpoint accessed with method: {request.method}")
    
    # Handle OPTIONS method for CORS preflight requests
    if request.method == 'OPTIONS':
        return '', 200
        
    # Handle GET request (for browser access)
    if request.method == 'GET':
        return jsonify({
            'status': 'error',
            'message': 'This endpoint only accepts POST requests for file uploads. Use a POST request with a form containing a file field named "file".'
        }), 400
    
    # Handle POST request
    if 'file' not in request.files:
        logger.error("No file part in the request")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        logger.error("No selected file")
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        # Create a unique filename to avoid conflicts
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'filepath': filepath,
            'filename': unique_filename
        })
    else:
        return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/process', methods=['GET', 'POST', 'OPTIONS'])
def process_video():
    # Handle OPTIONS method for CORS preflight requests
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json

    if not data or 'filepath' not in data:
        return jsonify({'error': 'No filepath provided'}), 400

    filepath = data['filepath']
    filepath = os.path.abspath(filepath)
    filepath = str(pathlib.Path(filepath))  # Normalize slashes for cross-platform compatibility

    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    try:
        # Extract frames
        frame_gap = int(data.get('frame_gap', 300))  # Default: extract a frame every 10 seconds
        frames_path, extracted_frames = save_frame(filepath, FRAMES_DIR, gap=frame_gap)

        # Transcribe video
        transcript_segments, transcript_text, transcript_file = transcribe_video(filepath)

        # Summarize
        summary = summarize_transcript(transcript_text)

        return jsonify({
            'success': True,
            'frames_path': frames_path,
            'frames': extracted_frames,
            'transcript_segments': transcript_segments,
            'transcript_file': transcript_file,
            'transcript_text': transcript_text,
            'summary': summary
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test', methods=['GET', 'OPTIONS'])
def test_api():
    if request.method == 'OPTIONS':
        return '', 200
        
    return jsonify({
        'status': 'success',
        'message': 'Study Buddy API is running!'
    })

# Serve static files (for frames and processed files)
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# Improved CORS handling
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Run the application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
