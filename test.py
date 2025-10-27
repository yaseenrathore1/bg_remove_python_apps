import os
import sys

def check_environment():
    print("🔧 Checking environment setup...")
    
    # Check Python version
    print(f"✅ Python version: {sys.version}")
    
    # Check required directories
    required_dirs = ['static/uploads', 'templates']
    for directory in required_dirs:
        if os.path.exists(directory):
            print(f"✅ Directory exists: {directory}")
        else:
            print(f"❌ Missing directory: {directory}")
    
    # Check required files
    required_files = ['app.py', 'requirements.txt', 'templates/index.html']
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ File exists: {file}")
        else:
            print(f"❌ Missing file: {file}")
    
    print("🎉 Environment check completed!")

if __name__ == "__main__":
    check_environment()