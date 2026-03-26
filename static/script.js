// =======================
// 🎥 GLOBAL VIDEO (REGISTER)
// =======================
let video = document.createElement("video");
video.autoplay = true;

// =======================
// 🎥 START CAMERA (REGISTER PAGE)
// =======================
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;

            let camDiv = document.getElementById("camera");
            camDiv.innerHTML = "";
            camDiv.appendChild(video);
        })
        .catch(() => alert("Camera access denied ❌"));
}

// =======================
// 📸 CAPTURE FACE (REGISTER)
// =======================
function captureFace() {
    let username = document.getElementById("username").value;

    if (!username) {
        alert("Enter username first ⚠️");
        return;
    }

    if (!video.srcObject) {
        alert("Start camera first 🎥");
        return;
    }

    let canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    let image = canvas.toDataURL("image/jpeg");

    fetch("/capture", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            image: image
        })
    })
    .then(res => res.text())
    .then(data => {
        alert(data);

        // stop camera
        video.srcObject.getTracks().forEach(track => track.stop());
    })
    .catch(() => alert("Capture failed ❌"));
}

// =======================
// 🔐 LOGIN BACKGROUND SCAN + AI RESPONSE
// =======================
function autoCaptureAndLogin() {
    const username = document.getElementById("username").value;
    const password = document.querySelector("input[name='password']").value;

    if (!username || !password) {
        alert("Enter username & password ⚠️");
        return;
    }

    // 🔥 SHOW SCAN OVERLAY
    document.getElementById("scanOverlay").classList.remove("hidden");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {

            let videoHidden = document.getElementById("video");
            videoHidden.srcObject = stream;

            setTimeout(() => {
                let canvas = document.getElementById("canvas");

                canvas.width = videoHidden.videoWidth;
                canvas.height = videoHidden.videoHeight;

                let ctx = canvas.getContext("2d");
                ctx.drawImage(videoHidden, 0, 0);

                let image = canvas.toDataURL("image/jpeg");

                // 🔥 SEND TO BACKEND
                fetch("/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: `username=${username}&password=${password}&image=${encodeURIComponent(image)}`
                })
                .then(res => res.text())
                .then(data => {

                    // stop camera
                    stream.getTracks().forEach(track => track.stop());

                    // =======================
                    // 🤖 SMART RESPONSE
                    // =======================
                    if (data === "SUCCESS") {
                        speak("Access Granted");
                        setTimeout(() => {
                            window.location.href = "/dashboard";
                        }, 1500);
                    }

                    else if (data === "NO_FACE") {
                        speak("Face not detected");
                        alert("❌ Face not detected");
                        hideOverlay();
                    }

                    else if (data === "FAIL") {
                        speak("Access Denied");
                        alert("❌ Face not matched");
                        hideOverlay();
                    }

                    else if (data === "INVALID") {
                        speak("Invalid credentials");
                        alert("❌ Wrong username or password");
                        hideOverlay();
                    }

                    else {
                        alert("⚠️ Unknown error");
                        hideOverlay();
                    }

                });

            }, 1500); // wait camera ready
        })
        .catch(() => {
            alert("Camera access denied ❌");
            hideOverlay();
        });
}

// =======================
// 🎤 VOICE FUNCTION
// =======================
function speak(text) {
    let speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
}

// =======================
// ❌ HIDE OVERLAY
// =======================
function hideOverlay() {
    document.getElementById("scanOverlay").classList.add("hidden");
}

// =======================
// ✨ INPUT GLOW EFFECT
// =======================
document.querySelectorAll("input").forEach(input => {
    input.addEventListener("focus", () => {
        input.style.boxShadow = "0 0 10px #00ff9f";
    });

    input.addEventListener("blur", () => {
        input.style.boxShadow = "none";
    });
});

// =======================
// 🌙 DARK MODE TOGGLE
// =======================
function toggleMode() {
    document.body.classList.toggle("dark");
}

// =======================
// 🔄 BUTTON LOADING (OPTIONAL)
// =======================
function showLoading(btn) {
    btn.innerText = "Processing...";
    btn.disabled = true;
}