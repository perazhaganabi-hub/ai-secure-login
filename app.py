from flask import Flask, render_template, request, redirect, session
import sqlite3
import os
import base64
import cv2
import numpy as np

app = Flask(__name__)
app.secret_key = "secret123"

if not os.path.exists("faces"):
    os.makedirs("faces")

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

@app.route("/")
def home():
    return render_template("register.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register", methods=["POST"])
def register():
    username = request.form["username"]
    password = request.form["password"]

    conn = sqlite3.connect("db.db")
    cursor = conn.cursor()

    user = cursor.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()

    if user:
        conn.close()
        return "EXISTS"

    cursor.execute("INSERT INTO users VALUES (?, ?)", (username, password))
    conn.commit()
    conn.close()

    return redirect("/login")

@app.route("/capture", methods=["POST"])
def capture():
    data = request.json
    username = data.get("username")
    image_data = data.get("image")

    img_data = base64.b64decode(image_data.split(",")[1])

    with open(f"faces/{username}.jpg", "wb") as f:
        f.write(img_data)

    return "OK"

@app.route("/login", methods=["POST"])
def login():
    try:
        username = request.form.get("username")
        password = request.form.get("password")
        image_data = request.form.get("image")

        if not username or not password:
            return "INVALID"

        conn = sqlite3.connect("db.db")
        user = conn.execute(
            "SELECT * FROM users WHERE username=? AND password=?",
            (username, password)
        ).fetchone()
        conn.close()

        if not user:
            return "INVALID"

        face_path = f"faces/{username}.jpg"
        if not os.path.exists(face_path):
            return "NO_FACE"

        if not image_data:
            return "NO_FACE"

        img_data = base64.b64decode(image_data.split(",")[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        login_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if login_img is None:
            return "NO_FACE"

        stored_img = cv2.imread(face_path)

        gray_login = cv2.cvtColor(login_img, cv2.COLOR_BGR2GRAY)
        gray_stored = cv2.cvtColor(stored_img, cv2.COLOR_BGR2GRAY)

        face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")

        faces1 = face_cascade.detectMultiScale(gray_stored, 1.3, 5)
        faces2 = face_cascade.detectMultiScale(gray_login, 1.3, 5)

        if len(faces1) == 0 or len(faces2) == 0:
            return "NO_FACE"

        (x, y, w, h) = faces1[0]
        stored_face = gray_stored[y:y+h, x:x+w]

        (x, y, w, h) = faces2[0]
        login_face = gray_login[y:y+h, x:x+w]

        stored_face = cv2.resize(stored_face, (200, 200))
        login_face = cv2.resize(login_face, (200, 200))

        diff = cv2.absdiff(stored_face, login_face)
        score = np.mean(diff)

        print("Face score:", score)

        if score < 30:
            session["user"] = username
            return "SUCCESS"
        else:
            return "FAIL"

    except Exception as e:
        print("ERROR:", e)
        return "ERROR"

@app.route("/dashboard")
def dashboard():
    if "user" in session:
        return render_template("dashboard.html", user=session["user"])
    return redirect("/login")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)