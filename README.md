<h1 align="center">🤖 DynAmi – Your AI-Powered Companion Robot</h1>

<p align="center">
  <img src="./images/logo.png" alt="DynAmi Logo" width="200"/>
</p>

<p align="center">
  <b>Autonomous • Interactive • AI-Powered</b><br/>
  DynAmi is a smart companion robot that can see, hear, talk, and interact naturally with humans.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/version-1.0-orange" />
</p>

---

## 🎥 Demo
<p align="center">
  <a href="./assets/demo.mp4">
    <img src="./images/demo_thumbnail.png" alt="Watch the Demo" width="600"/>
  </a>
</p>
<p align="center"><i>▶️ Click the thumbnail to watch DynAmi in action!</i></p>

---

## ✨ Key Features
✅ **Autonomous Navigation** – IR sensors & ultrasonic modules for obstacle detection and safe movement  
✅ **Bidirectional Communication** – Mobile app ↔ Node.js server ↔ Raspberry Pi ↔ STM32 robot  
✅ **AI-Powered Chat** – Real-time voice commands & responses with GPT-powered chatbot  
✅ **Facial Recognition & Emotion Detection** – Using OpenCV, DeepFace & face_recognition  
✅ **Individual Detection & Tracking** – YOLOv4-based tracking system  
✅ **Interactive Mobile App** – Control the robot, chat with AI, get real-time alerts  
✅ **Audio Output** – High-quality sound via LM4871 amplifier  

---

## 🌟 Overall Functionalities

<p align="center">
  <img src="./images/overall_functionalities.png" alt="Overall Functionalities" width="700"/>
</p>

DynAmi integrates **vision, speech, and autonomous navigation** into a unified platform.  
The system is built around **three main components**:

1. **Mobile App (React-Native)** – Provides user interface, controls, and chat.  
2. **Server (Node.js)** – Acts as a bridge between the app, AI services, and the robot.  
3. **Robot (Raspberry Pi + STM32)** – Executes movements, speech, and AI-based recognition.

---

## 🛠 Tech Stack

### 🔗 Software
| Category           | Technologies |
|--------------------|--------------|
| 🌐 **Frontend**    | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" width="20"/> React-Native · HTML · CSS |
| ⚙️ **Backend**     | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" width="20"/> Node.js · Express.js |
| 🐍 **Python**      | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" width="20"/> OpenCV · DeepFace · face_recognition · SpeechRecognition · gTTS |
| 🤖 **AI Models**   | YOLOv4 · GPT-4 API |
| 🔌 **Communication** | UART · Socket.io · LocalTunnel |

### 🔩 Hardware
| Component              | Icon |
|------------------------|------|
| 🖥️ Raspberry Pi 3B     | <img src="https://raw.githubusercontent.com/github/explore/main/topics/raspberry-pi/raspberry-pi.png" width="30"/> |
| 🔬 STM32 Nucleo        | <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/STMicroelectronics-Logo.svg/320px-STMicroelectronics-Logo.svg.png" width="50"/> |
| 🔊 LM4871 Speaker      | 🎵 |
| 🎥 USB Webcam          | 📷 |
| ⚙️ DC Motors           | ⚙️ |
| 📡 IR & Ultrasonic Sensors | 📡 |

---

## 📸 System Overview

### Architecture
<p align="center">
  <img src="./images/system_architecture.png" width="650"/>
</p>

### Wiring Diagram
<p align="center">
  <img src="./images/wiring.png" width="650"/>
</p>

---

## 📱 Mobile App
<p align="center">
  <img src="./images/app.png" width="300"/>
</p>
