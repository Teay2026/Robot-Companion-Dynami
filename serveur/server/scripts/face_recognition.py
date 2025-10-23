import cv2
import numpy as np
import sys
import json
import os

def load_face_cascade():
    """Load OpenCV face detection cascade"""
    try:
        # Try to load the face cascade
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        return face_cascade
    except Exception as e:
        print(f"Error loading face cascade: {e}", file=sys.stderr)
        return None

def detect_faces(image, face_cascade):
    """Detect faces in the image"""
    try:
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        return faces
    except Exception as e:
        print(f"Error detecting faces: {e}", file=sys.stderr)
        return []

def extract_face_features(image, face_rect):
    """Extract simple features from a face region"""
    try:
        x, y, w, h = face_rect
        face_region = image[y:y+h, x:x+w]

        # Convert to grayscale and resize to standard size
        face_gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        face_resized = cv2.resize(face_gray, (100, 100))

        # Calculate simple features (histogram)
        hist = cv2.calcHist([face_resized], [0], None, [256], [0, 256])
        hist = hist.flatten()

        # Normalize histogram
        hist = hist / (hist.sum() + 1e-8)

        return hist.tolist()
    except Exception as e:
        print(f"Error extracting face features: {e}", file=sys.stderr)
        return None

def load_known_faces():
    """Load known faces from data file"""
    try:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        faces_file = os.path.join(data_dir, 'faces.json')

        if os.path.exists(faces_file):
            with open(faces_file, 'r') as f:
                return json.load(f)
        else:
            return {}
    except Exception as e:
        print(f"Error loading known faces: {e}", file=sys.stderr)
        return {}

def compare_faces(features1, features2):
    """Compare two face feature vectors using histogram correlation"""
    try:
        if features1 is None or features2 is None:
            return 0.0

        # Convert to numpy arrays
        f1 = np.array(features1)
        f2 = np.array(features2)

        # Calculate correlation coefficient
        correlation = np.corrcoef(f1, f2)[0, 1]

        # Handle NaN values
        if np.isnan(correlation):
            return 0.0

        return float(correlation)
    except Exception as e:
        print(f"Error comparing faces: {e}", file=sys.stderr)
        return 0.0

def recognize_faces(image, faces, known_faces, threshold=0.6):
    """Recognize faces against known database"""
    recognized_people = []
    unknown_count = 0

    for face_rect in faces:
        features = extract_face_features(image, face_rect)
        if features is None:
            unknown_count += 1
            continue

        best_match = None
        best_score = 0.0

        # Compare against all known faces
        for name, face_data in known_faces.items():
            if 'encoding' in face_data:
                score = compare_faces(features, face_data['encoding'])
                if score > best_score and score > threshold:
                    best_score = score
                    best_match = name

        if best_match:
            recognized_people.append({
                'name': best_match,
                'confidence': best_score,
                'position': face_rect.tolist()
            })
        else:
            unknown_count += 1

    return recognized_people, unknown_count

def detect_basic_emotions(image, faces):
    """Basic emotion detection using simple heuristics"""
    emotions = []

    for i, face_rect in enumerate(faces):
        try:
            x, y, w, h = face_rect
            face_region = image[y:y+h, x:x+w]

            # Convert to grayscale
            face_gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)

            # Simple heuristic: analyze brightness and contrast
            mean_brightness = np.mean(face_gray)
            contrast = np.std(face_gray)

            # Very basic emotion estimation based on facial brightness/contrast
            if mean_brightness > 140 and contrast > 40:
                emotion = "happy"
                confidence = 0.6
            elif mean_brightness < 100:
                emotion = "sad"
                confidence = 0.5
            elif contrast > 50:
                emotion = "surprised"
                confidence = 0.5
            else:
                emotion = "neutral"
                confidence = 0.7

            emotions.append({
                'person': f'Person {i+1}',
                'emotion': emotion,
                'confidence': confidence,
                'position': face_rect.tolist()
            })

        except Exception as e:
            print(f"Error detecting emotion for face {i}: {e}", file=sys.stderr)
            emotions.append({
                'person': f'Person {i+1}',
                'emotion': 'unknown',
                'confidence': 0.0,
                'position': face_rect.tolist()
            })

    return emotions

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 face_recognition.py <image_file>")
        sys.exit(1)

    image_path = sys.argv[1]

    try:
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not load image")

        # Load face detection model
        face_cascade = load_face_cascade()
        if face_cascade is None:
            raise ValueError("Could not load face detection model")

        # Detect faces
        faces = detect_faces(image, face_cascade)

        # Load known faces database
        known_faces = load_known_faces()

        # Recognize faces
        recognized_people, unknown_count = recognize_faces(image, faces, known_faces)

        # Detect basic emotions
        emotions = detect_basic_emotions(image, faces)

        # Prepare result
        result = {
            'success': True,
            'total_faces': len(faces),
            'known_people': [person['name'] for person in recognized_people],
            'recognized_details': recognized_people,
            'unknown_people': unknown_count,
            'emotions': emotions,
            'face_positions': [face.tolist() for face in faces]
        }

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'total_faces': 0,
            'known_people': [],
            'recognized_details': [],
            'unknown_people': 0,
            'emotions': [],
            'face_positions': []
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()