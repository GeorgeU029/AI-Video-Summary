from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import logging
import datetime
import json
import subprocess
from werkzeug.utils import secure_filename
import whisper  # LOCAL Whisper
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# === CONFIGURATION ===
# Get API key from environment variable instead of hardcoding
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("Missing OPENAI_API_KEY environment variable")

# Add FFMPEG to path if needed
ffmpeg_path = os.getenv("FFMPEG_PATH")
if ffmpeg_path:
    os.environ["PATH"] = os.environ["PATH"] + os.pathsep + ffmpeg_path

client = OpenAI(api_key=openai_api_key)

# === LOGGING ===
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('app.log')]
)
logger = logging.getLogger(__name__)

# === FLASK SETUP ===
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("ALLOWED_ORIGINS", "*")}})

# === PATHS ===
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_DIR = os.path.join(BASE_DIR, 'processed')
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# File size limit (default 500MB, can be configured in .env)
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv("MAX_FILE_SIZE", 500)) * 1024 * 1024
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# === WHISPER ===
# Make model size configurable
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
logger.info(f"Loading Whisper model: {WHISPER_MODEL}...")
model = whisper.load_model(WHISPER_MODEL)  # Options: base, small, medium, large
logger.info("Whisper model loaded.")

# === HELPERS ===
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def transcribe_with_whisper(file_path):
    try:
        logger.info(f"Transcribing file: {file_path}")
        
        # Extract audio to a temporary file first
        audio_path = file_path + ".wav"
        
        # Extract audio using FFmpeg with explicit parameters
        cmd = [
            "ffmpeg", "-i", file_path, 
            "-vn",  # Disable video
            "-acodec", "pcm_s16le",  # Convert to PCM WAV
            "-ar", "16000",  # 16kHz sample rate (Whisper works best with this)
            "-ac", "1",  # Mono channel
            "-y",  # Overwrite output file if it exists
            audio_path
        ]
        
        subprocess.run(cmd, check=True)
        
        # Check if audio file was created and has content
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 1000:
            raise Exception("Failed to extract valid audio from video file")
        
        # Now transcribe the extracted audio
        result = model.transcribe(audio_path)
        
        # Clean up the temporary audio file
        os.remove(audio_path)
        
        return result["text"]
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return None

def generate_summary(transcript_text, filename, base_name):
    """Generate a summary for the given transcript text using OpenAI"""
    logger.info(f"Generating summary for {filename}")
    summary = ""
    try:
        # Create a summary prompt with better instructions
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=[
                {"role": "system", "content": "You are an expert at summarizing video content. Create a concise but comprehensive summary that captures the main points, key insights, and important details from the transcript. Structure your summary with clear sections and bullet points where appropriate."},
                {"role": "user", "content": f"Please summarize this video transcript:\n\n{transcript_text}"}
            ]
        )
        summary = response.choices[0].message.content.strip()
        
        # Save summary to a file
        summary_file = os.path.join(OUTPUT_DIR, f"{base_name}_summary.txt")
        with open(summary_file, "w", encoding="utf-8") as f:
            f.write(summary)
        
        # Update the registry to mark this file as summarized
        update_registry(filename, {'summarized': True, 'summary_file': summary_file})
        
        logger.info(f"Summary generated and saved for {filename}")
        return summary
    except Exception as e:
        logger.error(f"Summary generation error: {e}")
        return ""

def get_registry_data():
    """Load the file registry data"""
    file_registry = os.path.join(BASE_DIR, 'file_registry.json')
    if os.path.exists(file_registry):
        try:
            with open(file_registry, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading registry: {e}")
    return {}

def update_registry(filename, updates):
    """Update the registry entry for a file"""
    registry_data = get_registry_data()
    if filename in registry_data:
        registry_data[filename].update(updates)
    else:
        registry_data[filename] = updates
    
    # Save updated registry
    try:
        file_registry = os.path.join(BASE_DIR, 'file_registry.json')
        with open(file_registry, 'w') as f:
            json.dump(registry_data, f)
    except Exception as e:
        logger.error(f"Error saving registry: {e}")

def sanitize_path(path):
    """Additional security check to prevent path traversal attacks"""
    base_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
    abs_path = os.path.abspath(path)
    return abs_path if abs_path.startswith(base_dir) else None

# === ROUTES ===
@app.route('/')
def root():
    return jsonify({
        'status': 'success',
        'message': 'Local Whisper + ChatGPT backend running!',
        'endpoints': [
            '/api/upload - Upload video files (POST only)',
            '/api/process - Process uploaded videos (POST only)',
            '/api/summary - Generate or retrieve summaries (POST only)',
            '/api/chat - Chat with summary context (POST only)',
            '/api/videos - List processed videos (GET only)'
        ]
    })

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_video():
    if request.method == 'OPTIONS':
        return '', 200

    if 'file' not in request.files:
        logger.error("No file part in request")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        logger.error("No selected file")
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Add more debug logging
        logger.info(f"Saving file to: {filepath}")
        try:
            file.save(filepath)
            logger.info(f"File successfully saved: {filepath}")
            
            # Verify file was saved
            if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                logger.info(f"File verification successful: {filepath}")
            else:
                logger.error(f"File verification failed: {filepath}")
                return jsonify({'error': 'File upload failed (verification)'}), 500
                
            return jsonify({
                'success': True,
                'filename': unique_filename,
                'message': 'File uploaded successfully'
            })
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            return jsonify({'error': f'File upload failed: {str(e)}'}), 500
    else:
        extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'unknown'
        logger.error(f"File type not allowed: {extension}")
        return jsonify({'error': f'File type not allowed: {extension}. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

@app.route('/api/process', methods=['POST', 'OPTIONS'])
def process_video():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    if not data or 'filename' not in data:
        return jsonify({'error': 'Filename not provided'}), 400

    filename = data['filename']
    # Prevent path traversal
    filepath = sanitize_path(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    if not filepath or not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    logger.info(f"Processing file: {filename}")
    transcript_text = transcribe_with_whisper(filepath)
    if not transcript_text:
        return jsonify({'error': 'Transcription failed'}), 500

    base_name = os.path.splitext(os.path.basename(filepath))[0]
    transcript_file = os.path.join(OUTPUT_DIR, f"{base_name}_transcript.txt")
    with open(transcript_file, "w", encoding="utf-8") as f:
        f.write(transcript_text)

    # Always store the file info in our processing registry
    # This maps filenames to their base_names and processed state
    registry_data = get_registry_data()
    
    # Update registry with this file
    registry_data[filename] = {
        'base_name': base_name,
        'transcript_file': transcript_file,
        'processed': True,
        'summarized': False,
        'summary_file': None,
        'upload_time': str(datetime.datetime.now())
    }
    
    # Save updated registry
    update_registry(filename, registry_data[filename])

    # Generate a summary if auto-summarize is enabled
    summary = ""
    if os.getenv("GENERATE_SUMMARY", "false").lower() == "true":
        summary = generate_summary(transcript_text, filename, base_name)

    return jsonify({
        'success': True,
        'filename': filename,
        'transcript_text': transcript_text,
        'transcript_file': transcript_file,
        'summary': summary,
        'message': 'Video processed successfully. Use /api/summary endpoint to generate or retrieve a summary.'
    })

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat_with_gpt_api():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        message = data.get("message", "")
        context = data.get("context", "")

        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Compose the messages for the chat
        messages = []
        if context:
            messages.append({
                "role": "system",
                "content": f"You are a helpful assistant that knows this video summary:\n\n{context}"
            })
        else:
            messages.append({
                "role": "system",
                "content": "You are a helpful assistant answering questions about videos."
            })

        messages.append({"role": "user", "content": message})

        # Call the OpenAI API
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=messages
        )

        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/summary', methods=['POST', 'OPTIONS'])
def get_or_generate_summary():
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.json
    if not data or 'filename' not in data:
        return jsonify({'error': 'Filename not provided'}), 400
    
    filename = data['filename']
    force_regenerate = data.get('regenerate', False)
    
    # Check if the file exists in our registry
    registry_data = get_registry_data()
    if filename not in registry_data:
        return jsonify({'error': 'File not found in registry'}), 404
    
    file_info = registry_data[filename]
    
    # If the file is already summarized and we're not forcing regeneration
    if file_info.get('summarized', False) and not force_regenerate:
        summary_file = file_info.get('summary_file')
        if summary_file and os.path.exists(summary_file):
            try:
                with open(summary_file, 'r', encoding='utf-8') as f:
                    summary = f.read()
                return jsonify({
                    'success': True,
                    'filename': filename,
                    'summary': summary,
                    'source': 'cached'
                })
            except Exception as e:
                logger.error(f"Error reading summary file: {e}")
    
    # We need to generate a new summary
    # First, we need the transcript
    transcript_file = file_info.get('transcript_file')
    if not transcript_file or not os.path.exists(transcript_file):
        return jsonify({'error': 'Transcript file not found'}), 404
    
    try:
        # Read the transcript
        with open(transcript_file, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
        
        # Generate the summary
        summary = generate_summary(transcript_text, filename, file_info['base_name'])
        
        if not summary:
            return jsonify({'error': 'Failed to generate summary'}), 500
        
        return jsonify({
            'success': True,
            'filename': filename,
            'summary': summary,
            'source': 'new'
        })
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos', methods=['GET'])
def list_videos():
    try:
        registry_data = get_registry_data()
        
        # Format the response to include only relevant information
        videos = []
        for filename, info in registry_data.items():
            videos.append({
                'filename': filename,
                'processed': info.get('processed', False),
                'summarized': info.get('summarized', False),
                'upload_time': info.get('upload_time', 'unknown'),
                'base_name': info.get('base_name', '')
            })
        
        return jsonify({
            'success': True,
            'count': len(videos),
            'videos': videos
        })
    except Exception as e:
        logger.error(f"Error listing videos: {e}")
        return jsonify({'error': str(e)}), 500

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', os.getenv("ALLOWED_ORIGINS", "*"))
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# === START ===
if __name__ == '__main__':
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    app.run(host=host, port=port, debug=debug)