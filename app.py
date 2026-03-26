from flask import Flask, render_template, request, redirect, session
import sqlite3
import os
import base64
import cv2
import numpy as np

app = Flask(__name__)
app.secret_key = "supersecretkey"

# 📁 Create faces folder
if not os.path.exists("faces"):
    os.makedirs("faces")

# 🗄️ INIT DB
def init_db():
    conn = sqlite3.connect("db.db")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# 🏠 HOME
@app.route("/")
def home():
    return render_template("register.html")

# 📝 REGISTER
@app.route("/register", methods=["POST"])
def register():
    username = request.form["username"]
    password = request.form["password"]

    conn = sqlite3.connect("db.db")
    cursor = conn.cursor()

    # check user already exists
    user = cursor.execute(
        "SELECT * FROM users WHERE username=?",
        (username,)
    ).fetchone()

    if user:
        conn.close()
        return "⚠️ Username already exists!"

    # insert user
    cursor.execute(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        (username, password)
    )
    conn.commit()
    conn.close()

    # 🔥 DIRECT REDIRECT (NO MESSAGE)
    return redirect("/login")
# 📸 SAVE FACE
@app.route("/capture", methods=["POST"])
def capture():
    data = request.json
    username = data.get("username")
    image_data = data.get("image")

    if not username or not image_data:
        return "❌ Data missing"

    img_data = base64.b64decode(image_data.split(",")[1])

    with open(f"faces/{username}.jpg", "wb") as f:
        f.write(img_data)

    return "Face Saved ✅"

# 🔐 LOGIN PAGE
@app.route("/login")
def login_page():
    return render_template("login.html")

# 🔑 LOGIN (SMART RESPONSE)
@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")
    image_data = request.form.get("image")

    # 🔒 Attempt limit
    if "attempts" not in session:
        session["attempts"] = 0

    if session["attempts"] >= 3:
        return "🚫 Too many attempts"

    # 🔐 PASSWORD CHECK
    conn = sqlite3.connect("db.db")
    user = conn.execute(
        "SELECT * FROM users WHERE username=? AND password=?",
        (username, password)
    ).fetchone()
    conn.close()

    if not user:
        session["attempts"] += 1
        return "INVALID"

    # 🔐 FACE FILE CHECK
    if not os.path.exists(f"faces/{username}.jpg"):
        return "NO_FACE"

    # 🔥 CHECK IMAGE FROM FRONTEND
    if not image_data:
        return "NO_FACE"

    try:
        img_data = base64.b64decode(image_data.split(",")[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        login_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except:
        return "NO_FACE"

    # 🔐 LOAD STORED FACE
    stored_img = cv2.imread(f"faces/{username}.jpg")

    gray_login = cv2.cvtColor(login_img, cv2.COLOR_BGR2GRAY)
    gray_stored = cv2.cvtColor(stored_img, cv2.COLOR_BGR2GRAY)

    # 🔍 FACE DETECTION
    face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")

    faces1 = face_cascade.detectMultiScale(gray_stored, 1.3, 5)
    faces2 = face_cascade.detectMultiScale(gray_login, 1.3, 5)

    if len(faces1) == 0 or len(faces2) == 0:
        session["attempts"] += 1
        return "NO_FACE"

    # ✂️ CROP
    (x, y, w, h) = faces1[0]
    stored_face = gray_stored[y:y+h, x:x+w]

    (x, y, w, h) = faces2[0]
    login_face = gray_login[y:y+h, x:x+w]

    stored_face = cv2.resize(stored_face, (200, 200))
    login_face = cv2.resize(login_face, (200, 200))

    # 🔬 COMPARE
    diff = cv2.absdiff(stored_face, login_face)
    score = np.mean(diff)

    print("Face score:", score)

    # 🔐 FINAL DECISION
    if score < 50:
        session["user"] = username
        session["attempts"] = 0
        return "SUCCESS"
    else:
        session["attempts"] += 1
        return "FAIL"

# 🖥️ DASHBOARD
@app.route("/dashboard")
def dashboard():
    if "user" in session:
        return render_template("dashboard.html", user=session["user"])
    return redirect("/login")

# 🚪 LOGOUT
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

# 🚀 RUN (DEPLOY READY)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)