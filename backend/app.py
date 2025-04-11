from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import logging
from werkzeug.utils import secure_filename
import whisper  # LOCAL Whisper
from openai import OpenAI

# === CONFIGURATION ===
openai_api_key = ""  # <
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
CORS(app)

# === PATHS ===
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_DIR = os.path.join(BASE_DIR, 'processed')
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# === WHISPER ===
logger.info("Loading Whisper model...")
model = whisper.load_model("base")  # Options: base, small, medium, large
logger.info("Whisper model loaded.")

# === HELPERS ===
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def transcribe_with_whisper(file_path):
    try:
        logger.info(f"Transcribing file: {file_path}")
        result = model.transcribe(file_path)
        return result["text"]
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return None

# === ROUTES ===
@app.route('/')
def root():
    return jsonify({
        'status': 'success',
        'message': 'Local Whisper + ChatGPT backend running!',
        'endpoints': [
            '/api/upload - Upload video files (POST only)',
            '/api/process - Process uploaded videos (POST only)',
            '/api/chat - Chat with summary context (POST only)'
        ]
    })

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_video():
    if request.method == 'OPTIONS':
        return '', 200

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        return jsonify({
            'success': True,
            'filename': unique_filename,
            'message': 'File uploaded successfully'
        })
    else:
        return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/process', methods=['POST', 'OPTIONS'])
def process_video():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    if not data or 'filename' not in data:
        return jsonify({'error': 'Filename not provided'}), 400

    filename = data['filename']
    filepath = os.path.abspath(os.path.join(UPLOAD_FOLDER, filename))
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    logger.info(f"Processing file: {filename}")
    transcript_text = transcribe_with_whisper(filepath)
    if not transcript_text:
        return jsonify({'error': 'Transcription failed'}), 500

    base_name = os.path.splitext(os.path.basename(filepath))[0]
    transcript_file = os.path.join(OUTPUT_DIR, f"{base_name}_transcript.txt")
    with open(transcript_file, "w", encoding="utf-8") as f:
        f.write(transcript_text)


    return jsonify({
        'success': True,
        'transcript_text': transcript_text,
        'transcript_file': transcript_file
    })


@app.route('/api/chat', methods=['POST'])
def chat_with_gpt_api():
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

        messages.append({"role": "user", "content": message})

        # Call the OpenAI API using the new client format
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )

        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})

    except Exception as e:
        print("Chat error:", e)
        return jsonify({"error": str(e)}), 500


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# === START ===
if __name__ == '__main__':
    logger.info("🚀 Starting server with local Whisper + OpenAI GPT...")
    app.run(host='0.0.0.0', port=5000, debug=True)
