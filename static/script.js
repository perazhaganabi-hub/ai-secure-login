// ===============================
// 🎥 GLOBAL ELEMENTS
// ===============================
let video, canvas, msg;
let stream = null;

// ===============================
// ✅ LOAD AFTER DOM READY
// ===============================
window.onload = () => {
    video = document.getElementById("video");
    canvas = document.getElementById("canvas");
    msg = document.getElementById("msg");

    if (!video || !canvas || !msg) {
        console.error("❌ UI elements missing");
    } else {
        console.log("✅ UI Ready");
    }
};

// ===============================
// 🎥 START CAMERA
// ===============================
async function startCamera() {
    try {
        if (!video) {
            alert("Video not ready");
            return;
        }

        if (stream) return;

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });

        video.srcObject = stream;

        await new Promise(resolve => {
            video.onloadedmetadata = () => resolve();
        });

        console.log("🎥 Camera started");

    } catch (err) {
        console.error("Camera error:", err);
        alert("⚠️ Camera access denied / not available");
    }
}

// ===============================
// 📸 CAPTURE IMAGE
// ===============================
function captureImage() {
    if (!video || video.videoWidth === 0) {
        console.log("❌ Video not ready");
        return null;
    }

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.9);
}

// ===============================
// 🔊 VOICE
// ===============================
function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
}

// ===============================
// 🔍 SCAN OVERLAY
// ===============================
function showScan() {
    let overlay = document.getElementById("scanOverlay");
    if (overlay) overlay.style.display = "block";
}

function hideScan() {
    let overlay = document.getElementById("scanOverlay");
    if (overlay) overlay.style.display = "none";
}

// ===============================
// 📸 CAPTURE FACE (REGISTER)
// ===============================
async function captureFace() {
    const username = document.getElementById("username").value.trim();

    if (!username) {
        alert("Enter username first");
        return;
    }

    await startCamera();

    setTimeout(async () => {

        try {
            const image = captureImage();

            if (!image) {
                msg.innerText = "⚠️ Camera not ready";
                msg.style.color = "orange";
                return;
            }

            const res = await fetch("/capture", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    image: image
                })
            });

            const data = await res.text();

            console.log("CAPTURE:", data);

            msg.innerText = "✅ Face captured";
            msg.style.color = "lime";

        } catch (err) {
            console.error(err);
            msg.innerText = "❌ Capture failed";
            msg.style.color = "red";
        }

    }, 1000);
}

// ===============================
// 🔐 LOGIN FUNCTION
// ===============================
async function login() {
    if (!video || !canvas || !msg) {
        alert("UI not ready ❌");
        return;
    }

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        msg.innerText = "⚠️ Enter username & password";
        msg.style.color = "orange";
        return;
    }

    await startCamera();

    showScan();

    setTimeout(async () => {

        try {
            const image = captureImage();

            if (!image) {
                hideScan();
                msg.innerText = "⚠️ Camera not ready";
                msg.style.color = "orange";
                return;
            }

            let formData = new FormData();
            formData.append("username", username);
            formData.append("password", password);
            formData.append("image", image);

            const res = await fetch("/login", {
                method: "POST",
                body: formData
            });

            const data = await res.text();

            console.log("SERVER RESPONSE:", data);

            hideScan();

            if (data === "SUCCESS") {
                msg.innerText = "✅ Access Granted";
                msg.style.color = "lime";
                speak("Access Granted");

                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 1200);
            }

            else if (data === "FAIL") {
                msg.innerText = "❌ Face mismatch";
                msg.style.color = "red";
                speak("Access denied");
            }

            else if (data === "NO_FACE") {
                msg.innerText = "⚠️ Face not detected";
                msg.style.color = "orange";
                speak("Face not detected");
            }

            else if (data === "INVALID") {
                msg.innerText = "❌ Invalid username/password";
                msg.style.color = "red";
                speak("Invalid login");
            }

            else {
                msg.innerText = "⚠️ Server error";
                msg.style.color = "yellow";
                speak("System error");
            }

        } catch (err) {
            console.error("❌ Fetch error:", err);
            hideScan();
            msg.innerText = "❌ Request failed";
            msg.style.color = "red";
        }

    }, 1200);
}

// ===============================
// ⛔ STOP CAMERA
// ===============================
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        console.log("Camera stopped");
    }
}