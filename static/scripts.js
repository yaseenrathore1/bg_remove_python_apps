// GSAP and Locomotive Scroll Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initTheme();
    
    // Initialize Locomotive Scroll
    const scroll = new LocomotiveScroll({
        el: document.querySelector('[data-scroll-container]'),
        smooth: true,
        smartphone: { smooth: true },
        tablet: { smooth: true }
    });

    // Update Locomotive Scroll on page changes
    scroll.update();

    // GSAP Animations
    gsap.registerPlugin(ScrollTrigger);

    // Animate hero elements
    gsap.from('[data-scroll-speed="1"] > *', {
        duration: 1.2,
        y: 100,
        opacity: 0,
        stagger: 0.2,
        ease: "power3.out"
    });

    // Animate feature cards on scroll
    gsap.utils.toArray('.feature-card').forEach(card => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play none none reverse"
            },
            duration: 0.8,
            y: 50,
            opacity: 0,
            ease: "power2.out"
        });
    });

    // Parallax effect for sidebar
    gsap.to('.sidebar', {
        scrollTrigger: {
            trigger: '.sidebar',
            start: "top top",
            end: "bottom bottom",
            scrub: true
        },
        y: (i, target) => -ScrollTrigger.maxScroll(window) * 0.1,
        ease: "none"
    });

    // Animated background elements
    gsap.to('.bg-grid-pattern', {
        scrollTrigger: {
            scrub: true
        },
        x: 100,
        y: 50,
        ease: "none"
    });

    // Update ScrollTrigger when images load
    imagesLoaded(document.querySelector('body'), function() {
        scroll.update();
        ScrollTrigger.refresh();
    });
});

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const selectedFiles = document.getElementById('selectedFiles');
const fileList = document.getElementById('fileList');
const progressBar = document.getElementById('progressBar');
const loadingText = document.getElementById('loadingText');
const themeToggle = document.getElementById('themeToggle');

// State
let selectedFilesData = [];
let isProcessing = false;

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark ? 'dark' : 'light');
    
    // Animate theme transition
    gsap.fromTo('body', 
        { opacity: 0.8 }, 
        { opacity: 1, duration: 0.5, ease: "power2.out" }
    );
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun text-yellow-400';
    } else {
        icon.className = 'fas fa-moon text-gray-600';
    }
}

// Event Listeners
themeToggle.addEventListener('click', toggleTheme);
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', processImages);

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
    
    // GSAP animation for drag over
    gsap.to(uploadArea, {
        scale: 1.02,
        duration: 0.3,
        ease: "back.out(1.7)"
    });
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    // GSAP animation for drag leave
    gsap.to(uploadArea, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
    });
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    // GSAP animation for drop
    gsap.to(uploadArea, {
        scale: 1,
        duration: 0.3,
        ease: "elastic.out(1, 0.5)"
    });
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleFiles(files) {
    const validFiles = files.filter(file => {
        const extension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'];
        return validExtensions.includes(extension);
    });

    if (validFiles.length === 0) {
        showNotification('Please select valid image files (JPG, PNG, WEBP, BMP, TIFF)', 'error');
        return;
    }

    // Calculate total size
    const totalSize = validFiles.reduce((total, file) => total + file.size, 0);
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (totalSize > maxSize) {
        showNotification('Total file size exceeds 500MB limit. Please select smaller files or fewer images.', 'error');
        return;
    }

    selectedFilesData = [...selectedFilesData, ...validFiles];
    updateFileList();
    updateProcessButton();
    
    // Animate file list appearance
    gsap.from('#selectedFiles', {
        duration: 0.5,
        y: 20,
        opacity: 0,
        ease: "power2.out"
    });
}

function updateFileList() {
    if (selectedFilesData.length === 0) {
        selectedFiles.classList.add('hidden');
        return;
    }

    fileList.innerHTML = '';
    
    // Calculate totals
    const totalSize = selectedFilesData.reduce((total, file) => total + file.size, 0);
    const totalFiles = selectedFilesData.length;

    // Add summary
    const summaryElement = document.createElement('div');
    summaryElement.className = 'bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl mb-4 border border-blue-200 dark:border-blue-500/20';
    summaryElement.innerHTML = `
        <div class="flex items-center justify-between text-sm">
            <span class="font-semibold text-blue-800 dark:text-blue-300">
                <i class="fas fa-layer-group mr-2"></i>${totalFiles} files selected
            </span>
            <span class="text-blue-600 dark:text-blue-400">${formatFileSize(totalSize)} total</span>
        </div>
    `;
    fileList.appendChild(summaryElement);

    // Add file list with scroll
    const filesContainer = document.createElement('div');
    filesContainer.className = 'space-y-3 max-h-48 overflow-y-auto pr-2 file-list-container';
    
    selectedFilesData.forEach((file, index) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item bg-gray-50 dark:bg-dark-300 p-3 rounded-xl border border-gray-200 dark:border-dark-400';
        fileElement.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center flex-1 min-w-0">
                    <i class="fas fa-image text-blue-500 mr-3 flex-shrink-0"></i>
                    <span class="text-sm text-gray-700 dark:text-gray-300 truncate">${file.name}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">(${formatFileSize(file.size)})</span>
                </div>
                <button onclick="removeFile(${index})" class="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2 flex-shrink-0 transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        filesContainer.appendChild(fileElement);
    });

    fileList.appendChild(filesContainer);
    selectedFiles.classList.remove('hidden');
}

function removeFile(index) {
    // Animate removal
    const fileElement = fileList.querySelectorAll('.file-item')[index];
    if (fileElement) {
        gsap.to(fileElement, {
            opacity: 0,
            x: -50,
            duration: 0.3,
            onComplete: () => {
                selectedFilesData.splice(index, 1);
                updateFileList();
                updateProcessButton();
            }
        });
    } else {
        selectedFilesData.splice(index, 1);
        updateFileList();
        updateProcessButton();
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateProcessButton() {
    if (selectedFilesData.length > 0 && !isProcessing) {
        processBtn.disabled = false;
        if (selectedFilesData.length > 1) {
            processBtn.innerHTML = `<i class="fas fa-layer-group mr-2"></i>Process ${selectedFilesData.length} Images`;
        } else {
            processBtn.innerHTML = `<i class="fas fa-magic mr-2"></i>Process Image`;
        }
        
        // Animate button enable
        gsap.to(processBtn, {
            scale: 1.05,
            duration: 0.2,
            yoyo: true,
            repeat: 1
        });
    } else {
        processBtn.disabled = true;
        processBtn.innerHTML = `<i class="fas fa-magic mr-2"></i>Process Images`;
    }
}

async function processImages() {
    if (selectedFilesData.length === 0 || isProcessing) return;

    isProcessing = true;
    updateProcessButton();

    // Show loading section with animation
    loadingSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    
    // Animate loading section in
    gsap.from(loadingSection, {
        duration: 0.5,
        y: 50,
        opacity: 0,
        ease: "power2.out"
    });
    
    // Update loading text based on file count
    const fileCount = selectedFilesData.length;
    if (fileCount > 50) {
        loadingText.innerHTML = `<i class="fas fa-rocket mr-2"></i>Processing ${fileCount} images - This may take a few minutes...`;
    } else if (fileCount > 20) {
        loadingText.innerHTML = `<i class="fas fa-bolt mr-2"></i>Processing ${fileCount} images in parallel...`;
    } else {
        loadingText.innerHTML = `<i class="fas fa-spinner mr-2"></i>Processing ${fileCount} images...`;
    }
    
    // Smooth scroll to loading
    loadingSection.scrollIntoView({ behavior: 'smooth' });

    // Simulate progress for better UX
    simulateProgress();

    try {
        const formData = new FormData();
        selectedFilesData.forEach(file => {
            formData.append('file', file);
        });

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showResults(result);
        } else {
            throw new Error(result.error || 'Processing failed');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        progressBar.style.width = '0%';
        isProcessing = false;
        updateProcessButton();
    }
}

function simulateProgress() {
    let progress = 0;
    const fileCount = selectedFilesData.length;
    
    // Adjust speed based on file count
    const speed = fileCount > 50 ? 100 : fileCount > 20 ? 150 : 200;
    
    const interval = setInterval(() => {
        if (progress >= 90) {
            clearInterval(interval);
            return;
        }
        
        // Slow down progress simulation for large batches
        const increment = fileCount > 50 ? 0.5 : fileCount > 20 ? 1 : 2;
        progress += increment + (Math.random() * 2);
        
        if (progress > 90) progress = 90;
        
        progressBar.style.width = progress + '%';
        
        // Update loading text with progress for large batches
        if (fileCount > 20) {
            loadingText.innerHTML = 
                `<i class="fas fa-spinner mr-2"></i>Processing ${fileCount} images... ${Math.round(progress)}%`;
        }
    }, speed);
}

function showResults(result) {
    // Animate loading section out
    gsap.to(loadingSection, {
        opacity: 0,
        y: -50,
        duration: 0.5,
        onComplete: () => {
            loadingSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            
            // Animate results section in
            gsap.from(resultsSection, {
                duration: 0.8,
                y: 50,
                opacity: 0,
                ease: "back.out(1.7)"
            });
        }
    });

    if (result.type === 'single') {
        // Show single result
        document.getElementById('singleResult').classList.remove('hidden');
        document.getElementById('bulkResult').classList.add('hidden');

        // Set preview images with error handling
        const originalPreview = document.getElementById('originalPreview');
        const processedPreview = document.getElementById('processedPreview');
        
        // Use placeholder if original file is not available
        if (result.original_file) {
            originalPreview.src = `/preview/${result.original_file}`;
            originalPreview.onerror = function() {
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWMTIwSDgwVjYwWiIgZmlsbD0iIzlDQThBRiIvPgo8L3N2Zz4K';
            };
        }
        
        processedPreview.src = `/preview/${result.output_file}`;
        processedPreview.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWMTIwSDgwVjYwWiIgZmlsbD0iIzlDQThBRiIvPgo8L3N2Zz4K';
        };

        // Set download link
        document.getElementById('downloadBtn').href = `/download/${result.output_file}`;
    } else {
        // Show bulk result
        document.getElementById('singleResult').classList.add('hidden');
        document.getElementById('bulkResult').classList.remove('hidden');

        // Set bulk info
        document.getElementById('bulkFileCount').textContent = 
            `Successfully processed ${result.file_count} images`;

        // Set bulk download link
        const downloadBtn = document.getElementById('bulkDownloadBtn');
        downloadBtn.href = `/download/${result.output_file}`;
        downloadBtn.innerHTML = 
            `<i class="fas fa-download mr-2"></i>Download All (${result.file_count} Files)`;
    }

    // Show success notification
    showNotification(`Successfully processed ${result.file_count} image(s)!`, 'success');

    // Smooth scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Reset form for new uploads after delay
    setTimeout(() => {
        selectedFilesData = [];
        updateFileList();
        updateProcessButton();
        fileInput.value = '';
    }, 5000);
}

function showError(message) {
    // Animate error
    gsap.to(loadingSection, {
        opacity: 0,
        scale: 0.9,
        duration: 0.3,
        onComplete: () => {
            loadingSection.classList.add('hidden');
            showNotification('Error: ' + message, 'error');
        }
    });
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl transform transition-transform duration-300 ${
        type === 'error' ? 'bg-red-500 text-white' : 
        type === 'success' ? 'bg-green-500 text-white' : 
        'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'error' ? 'fa-exclamation-triangle' : 
                type === 'success' ? 'fa-check-circle' : 
                'fa-info-circle'
            } mr-3 text-lg"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    gsap.fromTo(notification, 
        { x: 300, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
    
    // Remove after 5 seconds
    setTimeout(() => {
        gsap.to(notification, {
            x: 300,
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }
        });
    }, 5000);
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl + U to focus upload
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        fileInput.click();
    }
    
    // Escape to clear selection
    if (e.key === 'Escape' && selectedFilesData.length > 0) {
        selectedFilesData = [];
        updateFileList();
        updateProcessButton();
        showNotification('Selection cleared', 'info');
    }
});

// Initialize
initTheme();
updateProcessButton();

// Export for global access
window.removeFile = removeFile;

// Simple imagesLoaded replacement
function imagesLoaded(container, callback) {
    const images = container.getElementsByTagName('img');
    let loaded = 0;
    
    if (images.length === 0) {
        callback();
        return;
    }
    
    Array.from(images).forEach(img => {
        if (img.complete) {
            imageLoaded();
        } else {
            img.addEventListener('load', imageLoaded);
            img.addEventListener('error', imageLoaded);
        }
    });
    
    function imageLoaded() {
        loaded++;
        if (loaded === images.length) {
            callback();
        }
    }
}