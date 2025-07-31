# 🤖 DynAmi – The Companion Robot

![DynAmi Logo](./images/logo.png) <!-- Replace with your logo -->

---

## 🎥 Demo Video
[![Watch the Demo](./images/demo_thumbnail.png)](./assets/demo.mp4)  
*(Click the image to watch the full demo)*

---

## 📜 Table of Contents
- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Hardware Components](#hardware-components)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)
- [Team](#team)
- [License](#license)

---

## 📖 About the Project
DynAmi is an **interactive companion robot** designed to communicate naturally with users, recognize faces and emotions, navigate autonomously, and provide an immersive experience through an AI-powered mobile application.

This project integrates **robotics, embedded systems, computer vision, speech recognition, and generative AI**, creating a unique platform for human-robot interaction.

---

## 🚀 Features
- ✅ **Autonomous Navigation** – Obstacle detection & avoidance using IR sensors  
- ✅ **Bidirectional Communication** – App ↔ Server ↔ Raspberry Pi ↔ STM32 ↔ Robot  
- ✅ **Voice Recognition & Speech Synthesis** – Using Python (SpeechRecognition & gTTS)  
- ✅ **Facial Recognition & Emotion Detection** – OpenCV, face_recognition & DeepFace  
- ✅ **Individual Detection & Tracking** – YOLOv4-based object detection  
- ✅ **Interactive Mobile App** – Control the robot, chat with AI, receive alerts  
- ✅ **Audio Output (Speaker)** – Amplified audio responses using LM4871  

---

## 🛠️ Tech Stack

### **Software**
- **Languages**: Python, Node.js, React-Native, HTML/CSS
- **Libraries**: OpenCV, DeepFace, face_recognition, SpeechRecognition, gTTS, socket.io  
- **AI/ML Models**: YOLOv4 for object detection, GPT-4 for chatbot responses  
- **Server Hosting**: LocalTunnel for external connectivity  

### **Hardware**
- Raspberry Pi 3B  
- STM32 Nucleo board  
- 2 DC motors with encoders  
- IR and ultrasonic sensors  
- 2 servomotors (horizontal & vertical)  
- USB Webcam  
- Microphone & speaker (amplified with LM4871)  

---

## 📡 System Architecture
![System Architecture](./images/system_architecture.png) <!-- Add your figure -->

---

## 🔩 Hardware Setup
![Wiring Diagram](./images/wiring.png) <!-- Add your wiring diagram -->

### Components Used:
- DC motors + encoders  
- IR & ultrasonic sensors for obstacle detection  
- Servomotors for light pointer movement  
- LM4871 amplifier for speaker  
- Webcam for vision & face recognition  
