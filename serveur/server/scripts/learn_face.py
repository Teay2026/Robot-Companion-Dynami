import cv2
import numpy as np
import sys
import json
import os

def load_face_cascade():
    """Load OpenCV face detection cascade"""
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        return face_cascade
    except Exception as e:
        print(f"Error loading face cascade: {e}", file=sys.stderr)
        return None

def detect_largest_face(image, face_cascade):
    """Detect the largest face in the image"""
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(50, 50)
        )

        if len(faces) == 0:
            return None

        # Find the largest face
        largest_face = max(faces, key=lambda face: face[2] * face[3])
        return largest_face

    except Exception as e:
        print(f"Error detecting face: {e}", file=sys.stderr)
        return None

def extract_face_encoding(image, face_rect):
    """Extract face encoding from the face region"""
    try:
        x, y, w, h = face_rect

        # Add some padding around the face
        padding = int(0.1 * min(w, h))
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(image.shape[1] - x, w + 2 * padding)
        h = min(image.shape[0] - y, h + 2 * padding)

        face_region = image[y:y+h, x:x+w]

        # Convert to grayscale and resize
        face_gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        face_resized = cv2.resize(face_gray, (100, 100))

        # Extract multiple features for better recognition
        features = {}

        # 1. Histogram features
        hist = cv2.calcHist([face_resized], [0], None, [256], [0, 256])
        hist = hist.flatten()
        hist = hist / (hist.sum() + 1e-8)
        features['histogram'] = hist.tolist()

        # 2. LBP (Local Binary Pattern) features
        lbp = calculate_lbp(face_resized)
        lbp_hist = cv2.calcHist([lbp], [0], None, [256], [0, 256])
        lbp_hist = lbp_hist.flatten()
        lbp_hist = lbp_hist / (lbp_hist.sum() + 1e-8)
        features['lbp'] = lbp_hist.tolist()

        # 3. Edge features
        edges = cv2.Canny(face_resized, 50, 150)
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        features['edge_density'] = float(edge_density)

        # 4. Geometric features
        features['width_height_ratio'] = float(w / h)
        features['face_size'] = int(w * h)

        return features

    except Exception as e:
        print(f"Error extracting face encoding: {e}", file=sys.stderr)
        return None

def calculate_lbp(image):
    """Calculate Local Binary Pattern"""
    try:
        rows, cols = image.shape
        lbp = np.zeros((rows-2, cols-2), dtype=np.uint8)

        for i in range(1, rows-1):
            for j in range(1, cols-1):
                center = image[i, j]
                binary_string = ""

                # 8-neighbor LBP
                neighbors = [
                    image[i-1, j-1], image[i-1, j], image[i-1, j+1],
                    image[i, j+1], image[i+1, j+1], image[i+1, j],
                    image[i+1, j-1], image[i, j-1]
                ]

                for neighbor in neighbors:
                    binary_string += "1" if neighbor >= center else "0"

                lbp[i-1, j-1] = int(binary_string, 2)

        return lbp

    except Exception as e:
        print(f"Error calculating LBP: {e}", file=sys.stderr)
        return image[1:-1, 1:-1]  # Return cropped original if LBP fails

def load_faces_database():
    """Load existing faces database"""
    try:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        faces_file = os.path.join(data_dir, 'faces.json')

        if os.path.exists(faces_file):
            with open(faces_file, 'r') as f:
                return json.load(f)
        else:
            return {}
    except Exception as e:
        print(f"Error loading faces database: {e}", file=sys.stderr)
        return {}

def save_faces_database(faces_db):
    """Save faces database"""
    try:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        faces_file = os.path.join(data_dir, 'faces.json')

        with open(faces_file, 'w') as f:
            json.dump(faces_db, f, indent=2)

        return True
    except Exception as e:
        print(f"Error saving faces database: {e}", file=sys.stderr)
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 learn_face.py <image_file> <person_name>")
        sys.exit(1)

    image_path = sys.argv[1]
    person_name = sys.argv[2].strip()

    try:
        # Validate person name
        if not person_name or len(person_name) < 1:
            raise ValueError("Person name must be provided")

        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not load image")

        # Load face detection model
        face_cascade = load_face_cascade()
        if face_cascade is None:
            raise ValueError("Could not load face detection model")

        # Detect the largest face
        face_rect = detect_largest_face(image, face_cascade)
        if face_rect is None:
            raise ValueError("No face detected in the image")

        # Extract face encoding
        encoding = extract_face_encoding(image, face_rect)
        if encoding is None:
            raise ValueError("Could not extract face features")

        # Load existing database
        faces_db = load_faces_database()

        # Add or update the person
        faces_db[person_name] = {
            'name': person_name,
            'encoding': encoding,
            'learned_at': str(np.datetime64('now')),
            'face_position': face_rect.tolist(),
            'image_path': image_path
        }

        # Save database
        if save_faces_database(faces_db):
            result = {
                'success': True,
                'person_name': person_name,
                'face_position': face_rect.tolist(),
                'encoding_size': len(str(encoding)),
                'message': f"Successfully learned face for {person_name}"
            }
        else:
            raise ValueError("Failed to save face database")

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'person_name': person_name if 'person_name' in locals() else 'unknown',
            'message': f"Failed to learn face: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()