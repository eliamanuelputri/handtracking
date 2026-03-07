// MediaPipe Hand Tracking Setup
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const trackingStatus = document.getElementById('trackingStatus');

const cursor = document.getElementById('virtualCursor');
const pinchIndicator = document.getElementById('pinchIndicator');

let isPinching = false;
let screenW = window.innerWidth;
let screenH = window.innerHeight;

window.addEventListener('resize', () => {
    screenW = window.innerWidth;
    screenH = window.innerHeight;
});

// Calculate distance between two points (3D but we can just use 2D x,y for basic pinch)
function calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    // z axis can be included for better accuracy, but for a 2D webcam feed x,y and z approx is fine
    // return Math.sqrt(dx*dx + dy*dy + (p1.z - p2.z)**2);
    return Math.sqrt(dx*dx + dy*dy);
}

// Map normalized coords [0,1] to screen pixels
function getScreenCoords(landmark) {
    // Define an active tracking area (e.g., dropping the outer 20% of the camera frame)
    // This allows the user to reach the edges of the screen with smaller hand movements.
    const marginX = 0.2;
    const marginY = 0.2;
    
    // Re-map the coordinate from [marginX, 1 - marginX] to [0, 1]
    let scaledX = (landmark.x - marginX) / (1 - 2 * marginX);
    let scaledY = (landmark.y - marginY) / (1 - 2 * marginY);
    
    // Clamp the values so the cursor stops at the screen edges
    scaledX = Math.max(0, Math.min(1, scaledX));
    scaledY = Math.max(0, Math.min(1, scaledY));

    // Video is mirrored visually, so invert X
    const x = (1 - scaledX) * screenW; 
    const y = scaledY * screenH;
    
    return { x, y };
}

function onResults(results) {
    // Draw landmarks on the preview canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // The image itself is drawn via CSS on the video element, we only draw landmarks here.
    // But since the video is scaled, drawing landmarks on the preview canvas might not perfectly align
    // unless the canvas also matches exactly. We'll skip drawing on the preview canvas for now
    // and rely just on the screen-wide "virtual cursor" for UX.
    canvasCtx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Use first hand detected
        const hand = results.multiHandLandmarks[0];
        
        const indexTip = hand[8]; // INDEX_FINGER_TIP
        const thumbTip = hand[4]; // THUMB_TIP

        // Move Cursor
        const cursorCoords = getScreenCoords(indexTip);
        cursor.style.left = cursorCoords.x + 'px';
        cursor.style.top = cursorCoords.y + 'px';

        // Detect Pinch (Distance threshold ~ 0.12 normalized units for easier grabbing)
        const dist = calculateDistance(indexTip, thumbTip);
        const pinchThreshold = 0.12; // Increased sensitivity

        if (dist < pinchThreshold) {
            // Pinch Active
            if (!isPinching) {
                isPinching = true;
                cursor.classList.add('grabbing');
                pinchIndicator.classList.add('show');
                // Trigger Game Grab
                if(window.GameInterface) {
                    window.GameInterface.handlePinchStart(cursorCoords.x, cursorCoords.y);
                }
            } else {
                // Pinch Moving
                if(window.GameInterface) {
                    window.GameInterface.handlePinchMove(cursorCoords.x, cursorCoords.y);
                }
            }
        } else {
            // Pinch Released
            if (isPinching) {
                isPinching = false;
                cursor.classList.remove('grabbing');
                pinchIndicator.classList.remove('show');
                // Trigger Game Drop
                if(window.GameInterface) {
                    window.GameInterface.handlePinchEnd(cursorCoords.x, cursorCoords.y);
                }
            }
        }
    }
}

const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// Initialize Camera via MediaPipe Camera Utils
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: 320,
  height: 240
});

camera.start()
    .then(() => {
        trackingStatus.textContent = "Tracking Active";
        trackingStatus.className = "status-msg success";
    })
    .catch((err) => {
        console.error(err);
        trackingStatus.textContent = "Camera access denied or error";
        trackingStatus.className = "status-msg error";
    });
