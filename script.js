
// Global variables
let session = null;
let selectedImage = null;
let originalImageElement = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
        // Set up file input listener
        document.getElementById('imageInput').addEventListener('change', handleImageUpload);
        
        // Set up drag and drop
        const uploadContainer = document.getElementById('uploadContainer');
        uploadContainer.addEventListener('click', () => document.getElementById('imageInput').click());
        uploadContainer.addEventListener('dragover', handleDragOver);
        uploadContainer.addEventListener('dragleave', handleDragLeave);
        uploadContainer.addEventListener('drop', handleDrop);
        
        // Set up detect button
        document.getElementById('detectBtn').addEventListener('click', detectFaces);
        
        console.log('Face Blur Studio initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showStatus('Failed to initialize application: ' + error.message, 'error');
    }
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file processing
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showStatus('Please select a valid image file', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showStatus('File size must be less than 10MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedImage = e.target.result;
        displayImagePreview(selectedImage);
        document.getElementById('detectBtn').disabled = false;
        showStatus('Image uploaded successfully. Click "Detect & Blur Faces" to proceed.', 'success');
    };
    reader.readAsDataURL(file);
}

// Display image preview
function displayImagePreview(imageSrc) {
    // Hide previous results
    document.getElementById('results').style.display = 'none';
    
    // Show processing layout with preview (no top preview)
    showProcessingLayoutWithPreview(imageSrc);
}

// Show processing layout with preview
function showProcessingLayoutWithPreview(imageSrc) {
    const mainContainer = document.querySelector('.main-container');
    const processingLayout = document.getElementById('processingLayout');
    const uploadContainer = document.getElementById('uploadContainer');
    const detectBtn = document.getElementById('detectBtn');
    
    // Hide upload area and detect button
    uploadContainer.style.display = 'none';
    detectBtn.style.display = 'none';
    
    // Show processing layout
    processingLayout.classList.add('active');
    mainContainer.classList.add('processing-view');
    
    // Show uploaded image in preview area
    const previewArea = document.getElementById('previewArea');
    previewArea.innerHTML = `<img src="${imageSrc}" class="preview-image" alt="Uploaded Image">`;
    previewArea.classList.add('has-image');
    
    // Store reference to the image element
    originalImageElement = previewArea.querySelector('img');
    
    // Update processing button to show "Detect Faces"
    const processingBtn = document.getElementById('processingBtn');
    processingBtn.disabled = false;
    processingBtn.innerHTML = '<div class="refresh-icon"></div>Detect Faces';
    processingBtn.onclick = detectFaces;
    
    // Set up processing layout controls
    setupProcessingControls();
}

// Setup processing layout controls
function setupProcessingControls() {
    // Intensity slider
    const intensitySlider = document.getElementById('intensitySlider');
    const intensityValue = document.getElementById('intensityValue');
    
    intensitySlider.addEventListener('input', function() {
        intensityValue.textContent = this.value + '%';
    });
    
    // Process another button
    document.getElementById('processAnotherBtn').addEventListener('click', function() {
        resetToUploadView();
    });
    
    // Clear image button
    document.getElementById('clearImageBtn').addEventListener('click', function() {
        resetToUploadView();
    });
    
    // Show original button
    document.getElementById('showOriginalBtn').addEventListener('click', function() {
        showOriginalImage();
    });
}

// Reset to upload view
function resetToUploadView() {
    const mainContainer = document.querySelector('.main-container');
    const processingLayout = document.getElementById('processingLayout');
    const uploadContainer = document.getElementById('uploadContainer');
    const detectBtn = document.getElementById('detectBtn');
    const results = document.getElementById('results');
    
    // Hide processing layout
    processingLayout.classList.remove('active');
    mainContainer.classList.remove('processing-view');
    
    // Show upload area and detect button
    uploadContainer.style.display = 'block';
    detectBtn.style.display = 'block';
    
    // Hide results
    results.style.display = 'none';
    
    // Reset form
    document.getElementById('imageInput').value = '';
    selectedImage = null;
    originalImageElement = null;
    detectBtn.disabled = true;
    
    // Clear status
    document.getElementById('status').style.display = 'none';
}

// Show original image
function showOriginalImage() {
    const previewArea = document.getElementById('previewArea');
    
    if (selectedImage) {
        previewArea.innerHTML = `<img src="${selectedImage}" class="preview-image" alt="Original Image">`;
        previewArea.classList.add('has-image');
    }
}

// Detect faces using the RetinaFace model
async function detectFaces() {
    if (!selectedImage) {
        showStatus('Please upload an image first', 'error');
        return;
    }

    try {
        // Show processing state in preview area
        showProcessingState();
        
        // Load the model if not already loaded
        if (!session) {
            session = await loadRetinaFaceModel();
        }
        
        // Process the image
        const results = await processImage(selectedImage);
        
        // Display results in preview area
        displayProcessedImage(results);
        
    } catch (error) {
        console.error('Face detection failed:', error);
        showProcessingError(error.message);
    }
}

// Show processing state
function showProcessingState() {
    const previewArea = document.getElementById('previewArea');
    const processingBtn = document.getElementById('processingBtn');
    
    previewArea.innerHTML = `
        <div class="processing-spinner"></div>
        <div class="processing-text">Processing with ML server...</div>
    `;
    previewArea.classList.remove('has-image');
    
    processingBtn.disabled = true;
}

// Display processed image
function displayProcessedImage(results) {
    const previewArea = document.getElementById('previewArea');
    const processingBtn = document.getElementById('processingBtn');
    
    if (results.processedImage) {
        previewArea.innerHTML = `<img src="${results.processedImage}" class="preview-image" alt="Processed Image">`;
        previewArea.classList.add('has-image');
    }
    
    processingBtn.disabled = false;
    processingBtn.innerHTML = '<div class="refresh-icon"></div>Process Complete';
}

// Show processing error
function showProcessingError(message) {
    const previewArea = document.getElementById('previewArea');
    const processingBtn = document.getElementById('processingBtn');
    
    previewArea.innerHTML = `
        <div style="color: #c62828; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
            <div>Processing failed: ${message}</div>
        </div>
    `;
    previewArea.classList.remove('has-image');
    
    processingBtn.disabled = false;
    processingBtn.innerHTML = '<div class="refresh-icon"></div>Retry Processing';
}


// Load the RetinaFace model from Hugging Face
async function loadRetinaFaceModel() {
    try {
        showStatus('Downloading RetinaFace model from Hugging Face...', 'loading');
        
        // Ensure ONNX Runtime is available
        if (!ort) {
            throw new Error('ONNX Runtime not initialized');
        }

        // Model URL from Hugging Face
        const modelUrl = 'https://huggingface.co/amd/retinaface/resolve/main/weights/RetinaFace_int.onnx';

        // Load the model using ONNX Runtime
        const session = await ort.InferenceSession.create(modelUrl, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all'
        });
        
        // Log model inputs to see what's expected
        console.log('Model inputs:', session.inputNames);
        console.log('Model outputs:', session.outputNames);
        
        console.log('RetinaFace model loaded successfully');
        return session;
        
    } catch (error) {
        console.error('Failed to load RetinaFace model:', error);
        throw new Error('Failed to load RetinaFace model: ' + error.message);
    }
}

// Process the image for face detection
async function processImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async function() {
            try {
                // Create canvas for image processing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size to image size
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw image on canvas
                ctx.drawImage(img, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Preprocess image for the model
                const inputTensorWithResize = preprocessImage(imageData);
                
                const {tensor, scale, resizeRatio} = inputTensorWithResize;

                console.log("resize ratio", resizeRatio);
                console.log("scale", scale);
                
                // Run inference with correct input name
                const outputs = await session.run({
                    'RetinaFace::input_0': tensor
                });

                console.log("output tensor", outputs);
                
                
                // Post-process results
                const results = postprocessResults(outputs, canvas.width, canvas.height, scale, resizeRatio);
                
                resolve(results);
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = function() {
            reject(new Error('Failed to load image'));
        };
        
        img.src = imageSrc;
    });
}

function resizeImage(image, reSize, keepRatio = true) {
    /**
     * Resize image
     * @param {HTMLImageElement|HTMLCanvasElement} image - origin image
     * @param {Array} reSize - resize scale [width, height]
     * @param {boolean} keepRatio - keep aspect ratio. Default is true.
     * @returns {Object} - {reImage: resized canvas, resizeRatio: resize ratio}
     */
    
    if (!keepRatio) {
        // Create canvas for resized image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = reSize[0];
        canvas.height = reSize[1];
        
        // Draw and resize image
        ctx.drawImage(image, 0, 0, reSize[0], reSize[1]);
        
        return {
            reImage: canvas,
            resizeRatio: 0,
            padTop: 0
        };
    }
    
    // Calculate aspect ratio
    const ratio = reSize[0] * 1.0 / reSize[1];
    const h = image.height;
    const w = image.width;
    
    let resizeRatio, reH, reW;

    console.log("Debug resize ", reSize[1], w);
    console.log("Debug resize ", reSize[0], h)
    
    if (h * 1.0 / w <= ratio) {
        resizeRatio = reSize[1] * 1.0 / w;
        reH = Math.floor(h * resizeRatio);
        reW = reSize[1];
    } else {
        resizeRatio = reSize[0] * 1.0 / h;
        reH = reSize[0];
        reW = Math.floor(w * resizeRatio);
    }

    console.log("Debug resize ",  resizeRatio);
    
    // Create canvas for resized image
    const resizedCanvas = document.createElement('canvas');
    const resizedCtx = resizedCanvas.getContext('2d');
    resizedCanvas.width = reW;
    resizedCanvas.height = reH;
    
    // Draw and resize image
    resizedCtx.drawImage(image, 0, 0, reW, reH);
    
    // Pad the image to target size
    const paddedImage = padImage(resizedCanvas, reH, reW, reSize, [0.0, 0.0, 0.0]);
    
    return {
        reImage: paddedImage,
        resizeRatio: resizeRatio
    };
}

function padImage(image, reH, reW, reSize, padValue) {
    /**
     * Pad image to target size
     * @param {HTMLCanvasElement} image - image to pad
     * @param {number} reH - resized height
     * @param {number} reW - resized width
     * @param {Array} reSize - target size [width, height]
     * @param {Array} padValue - padding color [R, G, B]
     * @returns {HTMLCanvasElement} - padded canvas
     */
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = reSize[0];
    canvas.height = reSize[1];
    
    // Fill with padding color
    ctx.fillStyle = `rgb(${padValue[0]}, ${padValue[1]}, ${padValue[2]})`;
    ctx.fillRect(0, 0, reSize[0], reSize[1]);
    
    // Calculate padding to center the image
    //const padTop = Math.floor((reSize[1] - reH) / 2);
    //const padLeft = Math.floor((reSize[0] - reW) / 2);
    
    // Draw the resized image centered
    ctx.drawImage(image, 0, 0);
    
    return canvas;
}

// Preprocess image for the RetinaFace model
function preprocessImage(imageData) {
    try {
        const { data, width, height } = imageData;
        
        // RetinaFace specifically expects input size of 640x608
        const targetWidth = 640;
        const targetHeight = 608;

        // Create a canvas from the imageData first
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // Put the imageData back onto a canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // Use the new resizeImage function
        const resizeResult = resizeImage(tempCanvas, [targetHeight, targetWidth], true);
        const resizedCanvas = resizeResult.reImage;
        
        // Get the resized image data
        const resizedData = resizedCanvas.getContext('2d').getImageData(0, 0, targetWidth, targetHeight);

        // Create float array for model input
        const floatArray = new Float32Array(targetHeight * targetWidth * 3);
        
        // Convert RGBA pixel data to BGR format and subtract mean values
        let pixelIndex = 0;
        for (let h = 0; h < targetHeight; h++) {
            for (let w = 0; w < targetWidth; w++) {
                const dataIndex = (h * targetWidth + w) * 4;
                floatArray[pixelIndex * 3] = resizedData.data[dataIndex + 2] - 104; //B        
                floatArray[pixelIndex * 3 + 1] = resizedData.data[dataIndex + 1] - 117; // G
                floatArray[pixelIndex * 3 + 2] = resizedData.data[dataIndex] - 123; // R
                pixelIndex++;
            }
        }
        
        // Ensure ONNX Runtime is available
        if (!ort) {
            throw new Error('ONNX Runtime not initialized');
        }
        
        // Create tensor with shape [1, height, width, channels] (batch, height, width, channels)
        const tensor = new ort.Tensor('float32', floatArray, [1, targetHeight, targetWidth, 3]);

        const scale = [targetWidth, targetHeight, targetWidth, targetHeight];
        const resizeRatio = resizeResult.resizeRatio;
        return {tensor, scale, resizeRatio};
        
    } catch (error) {
        console.error('Image preprocessing failed:', error);
        throw new Error('Image preprocessing failed: ' + error.message);
    }
}

// Post-process the model outputs
async function postprocessResults(outputs, originalWidth, originalHeight, scale, resizeRatio) {
    try {
         console.log('Post-processing inputs:', Object.keys(outputs));
         const outputKeys = Object.keys(outputs);
         console.log('Post-processing inputs first element:', outputs[outputKeys[0]]);
         const locData = {
            dims: outputs[outputKeys[0]].dims,
            data: Array.from(outputs[outputKeys[0]].data)
         }

         const confData = {
            dims: outputs[outputKeys[1]].dims,
            data: Array.from(outputs[outputKeys[1]].data)
         }
         // write code to call aws gateway api lambda function to postprocess results
         const response = await fetch('https://qfja8lmauf.execute-api.us-east-1.amazonaws.com/dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            //body: JSON.stringify({outputs, originalWidth, originalHeight}),
            body: JSON.stringify({"loc": locData, "conf": confData, "scale": scale, "resizeRatio": resizeRatio}),
         });
         const data = await response.json();
         console.log('Post-processing results:', JSON.parse(data.body));
         console.log('Post procesing boxes : ' , JSON.parse(data.body).boxes);
                   // Draw bounding boxes on the image
          const parsedData = JSON.parse(data.body);
          const boxes = parsedData.boxes || [];
          const confidence = parsedData.confidence || [];
          
          console.log('Drawing boxes:', boxes);
          console.log('Confidence scores:', confidence);
          
          // Create a canvas to draw the image with bounding boxes
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Get the original image from stored reference
          if (!originalImageElement) {
              throw new Error('No image found - please upload an image first');
          }
          
          const originalImage = originalImageElement;
          
          // Set canvas size to match the original image
          canvas.width = originalImage.naturalWidth;
          canvas.height = originalImage.naturalHeight;
          
          // Draw the original image on canvas
          ctx.drawImage(originalImage, 0, 0);
          
          // Draw bounding boxes
          ctx.strokeStyle = '#ff6b35';
          ctx.lineWidth = 3;
          ctx.font = '16px Arial';
          ctx.fillStyle = '#ff6b35';
          
          boxes.forEach((box, index) => {
              const [x1, y1, x2, y2] = box;
              const width = x2 - x1;
              const height = y2 - y1;
              const conf = confidence[index] ? confidence[index][0] : 0;
              
              // Draw rectangle
              ctx.strokeRect(x1, y1, width, height);
              
              // Draw confidence text
              const text = `${(conf * 100).toFixed(1)}%`;
              ctx.fillText(text, x1, y1 - 5);
              
              console.log(`Box ${index + 1}: x=${x1}, y=${y1}, w=${width}, h=${height}, conf=${conf}`);
          });
          
          // Create download link for the annotated image
          //const link = document.createElement('a');
          //link.href = canvas.toDataURL('image/png');
          //link.download = 'face_detection_result.png';
          //link.click();
          
          return {
              boxes: boxes,
              confidence: confidence,
              processedImage: canvas.toDataURL('image/png')
          };   
    }
    catch (error) {
        console.error('Post-processing failed:', error);
        throw new Error('Post-processing failed: ' + error.message);
    }
}

// Display detection results
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const statsDiv = document.getElementById('resultStats');
    
    let html = `<h3>Detection Results</h3>`;
    html += `<p><strong>Faces Detected:</strong> ${results.boxes.length}</p>`;
    
    if (results.boxes.length > 0) {
        html += `<p><strong>Average Confidence:</strong> ${(results.confidence.reduce((sum, conf) => sum + conf[0], 0) / results.confidence.length * 100).toFixed(1)}%</p>`;
    }
    
    statsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Utility function to download model manually if needed
async function downloadModelManually() {
    try {
        showStatus('Downloading model manually...', 'loading');
        
        const response = await fetch('https://huggingface.co/kc12700/yunet/resolve/main/yunet.onnx');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'yunet.onnx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('Model downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Manual download failed:', error);
        showStatus('Manual download failed: ' + error.message, 'error');
    }
}
