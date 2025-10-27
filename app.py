import os
import uuid
import zipfile
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, render_template, request, send_file, jsonify, send_from_directory
from rembg import remove, new_session
from PIL import Image
import io
from datetime import datetime, timedelta

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Add secret key

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'}

# Initialize rembg session for better performance
session = new_session()

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=8)

def cleanup_old_files():
    """Remove files older than 1 hour"""
    while True:
        try:
            now = datetime.now()
            for filename in os.listdir(app.config['UPLOAD_FOLDER']):
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if os.path.isfile(file_path):
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                    if now - file_time > timedelta(hours=1):
                        try:
                            os.remove(file_path)
                            print(f"Cleaned up: {filename}")
                        except:
                            pass
        except Exception as e:
            print(f"Cleanup error: {e}")
        
        threading.Event().wait(3600)  # Run every hour

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def remove_background_single(input_path, output_path):
    """Remove background from single image with high quality"""
    try:
        with open(input_path, 'rb') as input_file:
            input_data = input_file.read()
        
        # Use rembg with session for better performance
        output_data = remove(
            input_data,
            session=session
        )
        
        # Save as PNG to preserve transparency
        output_image = Image.open(io.BytesIO(output_data))
        output_image.save(output_path, 'PNG', optimize=True)
        
        return True
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

def process_single_image(args):
    """Process single image for parallel execution"""
    input_path, output_filename = args
    try:
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{uuid.uuid4().hex}.png")
        
        if remove_background_single(input_path, output_path):
            return (output_path, output_filename, True)
        else:
            return (input_path, output_filename, False)
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return (input_path, output_filename, False)

def process_bulk_images_parallel(file_paths):
    """Process multiple images in parallel and return zip file path"""
    zip_filename = f"batch_{uuid.uuid4().hex[:8]}.zip"
    zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
    
    # Prepare tasks for parallel processing
    tasks = []
    for input_path in file_paths:
        original_name = os.path.basename(input_path)
        name_without_ext = os.path.splitext(original_name)[0]
        output_filename = f"{name_without_ext}_no_bg.png"
        tasks.append((input_path, output_filename))
    
    successful_files = 0
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        # Process images in parallel
        with ThreadPoolExecutor(max_workers=8) as executor:
            future_to_task = {executor.submit(process_single_image, task): task for task in tasks}
            
            for future in as_completed(future_to_task):
                try:
                    output_path, output_filename, success = future.result()
                    
                    if success:
                        # Add successful file to zip
                        zipf.write(output_path, output_filename)
                        # Remove temp file
                        os.remove(output_path)
                        successful_files += 1
                    
                except Exception as e:
                    print(f"Error in parallel processing: {e}")
    
    print(f"Successfully processed {successful_files}/{len(tasks)} files")
    return zip_path

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file selected'}), 400
    
    files = request.files.getlist('file')
    
    # Validate files
    valid_files = []
    total_size = 0
    
    for file in files:
        if file and file.filename != '' and allowed_file(file.filename):
            # Get file size
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            
            total_size += file_size
            valid_files.append(file)
    
    if not valid_files:
        return jsonify({'error': 'No valid images selected. Supported formats: JPG, PNG, WEBP, BMP, TIFF'}), 400
    
    # Check total size (500MB limit)
    if total_size > 500 * 1024 * 1024:
        return jsonify({'error': 'Total file size exceeds 500MB limit'}), 400
    
    try:
        # Save all files first
        input_paths = []
        saved_files = []
        
        for file in valid_files:
            filename = f"{uuid.uuid4().hex}_{file.filename}"
            input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(input_path)
            input_paths.append(input_path)
            saved_files.append(file.filename)
        
        # Single file processing
        if len(input_paths) == 1:
            input_path = input_paths[0]
            output_filename = f"processed_{uuid.uuid4().hex}.png"
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
            
            # Process image
            if remove_background_single(input_path, output_path):
                # Cleanup input file
                try:
                    os.remove(input_path)
                except:
                    pass
                
                return jsonify({
                    'success': True,
                    'type': 'single',
                    'output_file': output_filename,
                    'original_file': saved_files[0],
                    'file_count': 1
                })
            else:
                # Cleanup on failure
                for path in input_paths:
                    try:
                        os.remove(path)
                    except:
                        pass
                return jsonify({'error': 'Failed to process image'}), 500
        
        # Bulk processing
        else:
            # Process images in parallel
            zip_path = process_bulk_images_parallel(input_paths)
            
            # Cleanup input files
            for path in input_paths:
                try:
                    os.remove(path)
                except:
                    pass
            
            return jsonify({
                'success': True,
                'type': 'bulk',
                'output_file': os.path.basename(zip_path),
                'file_count': len(valid_files),
                'total_size': total_size
            })
            
    except Exception as e:
        # Cleanup on any error
        for path in input_paths:
            try:
                os.remove(path)
            except:
                pass
        return jsonify({'error': f'Processing error: {str(e)}'}), 500

@app.route('/download/<filename>')
def download_file(filename):
    safe_filename = os.path.basename(filename)
    download_name = f"background_removed_{safe_filename}"
    
    if safe_filename.endswith('.zip'):
        download_name = f"background_removed_images.zip"
    
    return send_from_directory(
        app.config['UPLOAD_FOLDER'], 
        safe_filename, 
        as_attachment=True,
        download_name=download_name
    )


@app.route('/preview/<filename>')
def preview_file(filename):
    safe_filename = os.path.basename(filename)
    return send_from_directory(app.config['UPLOAD_FOLDER'], safe_filename)

# Error handlers
@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 500MB'}), 413

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🚀 Starting Free AI Background Remover...")
    print("📁 Upload folder:", app.config['UPLOAD_FOLDER'])
    print("🌐 Server running on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)