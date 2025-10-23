import cv2
import numpy as np
import sys
import json

def resize_frame(image, height=416, width=416):
    """Resize frame while maintaining aspect ratio"""
    hauteur, largeur = image.shape[:2]
    ratio = min(height / largeur, width / hauteur)

    nouvelle_largeur = int(largeur * ratio)
    nouvelle_hauteur = int(hauteur * ratio)

    image_redimensionnee = cv2.resize(image, (nouvelle_largeur, nouvelle_hauteur))

    # Create white background instead of black for better detection
    arriere_plan = 255 * np.ones((416, 416, 3), dtype=np.uint8)

    x_offset = (416 - nouvelle_largeur) // 2
    y_offset = (416 - nouvelle_hauteur) // 2

    arriere_plan[y_offset:y_offset + nouvelle_hauteur, x_offset:x_offset + nouvelle_largeur] = image_redimensionnee

    return arriere_plan

def load_yolo_model():
    """Load YOLO model with error handling"""
    try:
        net = cv2.dnn.readNet("./scripts/yolov4.weights", "./scripts/cfg/yolov4.cfg")

        with open("./scripts/coco.names", "r") as f:
            classes = [line.strip() for line in f.readlines()]

        layer_names = net.getLayerNames()
        output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

        return net, classes, output_layers
    except Exception as e:
        print(f"Error loading YOLO model: {e}", file=sys.stderr)
        return None, None, None

def detect_objects_enhanced(frame, net, classes, output_layers, confidence_threshold=0.5):
    """Enhanced object detection that detects all objects, not just people"""
    height, width, channels = frame.shape

    # Create blob from image
    blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)
    outs = net.forward(output_layers)

    # Information to show on screen
    class_ids = []
    confidences = []
    boxes = []
    detected_objects = []

    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]

            if confidence > confidence_threshold:
                # Object detected
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)

                # Rectangle coordinates
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)

                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)
                detected_objects.append({
                    'class': classes[class_id],
                    'confidence': float(confidence),
                    'box': [x, y, w, h],
                    'center': [center_x, center_y]
                })

    # Apply non-maximum suppression
    indexes = cv2.dnn.NMSBoxes(boxes, confidences, confidence_threshold, 0.4)

    final_objects = []
    people_positions = []

    if len(indexes) > 0:
        for i in indexes.flatten():
            obj = detected_objects[i]
            final_objects.append(obj['class'])

            if obj['class'] == 'person':
                people_positions.append({
                    'center': obj['center'],
                    'box': obj['box'],
                    'confidence': obj['confidence']
                })

    return {
        'objects': final_objects,
        'people_count': len(people_positions),
        'people_positions': people_positions,
        'all_detections': final_objects
    }

def generate_navigation_instruction(people_positions, frame_width, frame_height):
    """Generate navigation instructions based on detected people"""
    if not people_positions:
        return {'angle': 0, 'instruction': '', 'target': None}

    # Find the closest person (largest bounding box area)
    closest_person = max(people_positions, key=lambda p: p['box'][2] * p['box'][3])

    center_x, center_y = closest_person['center']
    box_area = closest_person['box'][2] * closest_person['box'][3]

    # Calculate frame center and thresholds
    frame_center_x = frame_width // 2
    frame_area = frame_width * frame_height

    # Area thresholds for distance estimation
    min_area_ratio = 0.05  # Too far
    max_area_ratio = 0.25  # Too close
    center_threshold = frame_width // 10  # Centering threshold

    area_ratio = box_area / frame_area

    # Determine horizontal angle
    angle = 0
    if center_x < frame_center_x - center_threshold:
        angle = -30 * (1 - center_x / frame_center_x)  # Turn left
    elif center_x > frame_center_x + center_threshold:
        angle = 30 * ((center_x - frame_center_x) / frame_center_x)  # Turn right

    # Determine movement instruction
    instruction = ""
    if area_ratio < min_area_ratio:
        instruction = "avance"  # Move forward (person too far)
    elif area_ratio > max_area_ratio:
        instruction = "recule"  # Move backward (person too close)

    return {
        'angle': round(angle, 2),
        'instruction': instruction,
        'target': {
            'position': closest_person['center'],
            'confidence': closest_person['confidence'],
            'distance_estimate': 'close' if area_ratio > max_area_ratio else 'far' if area_ratio < min_area_ratio else 'optimal'
        }
    }

def count_objects_by_type(objects):
    """Count objects by type"""
    from collections import Counter
    return dict(Counter(objects))

def generate_scene_description(detection_result):
    """Generate a natural language description of the scene"""
    objects = detection_result['objects']
    people_count = detection_result['people_count']
    object_counts = count_objects_by_type(objects)

    if not objects:
        return "I don't see anything specific in the scene."

    description_parts = []

    # Describe people
    if people_count > 0:
        if people_count == 1:
            description_parts.append("1 person")
        else:
            description_parts.append(f"{people_count} people")

    # Describe other objects
    other_objects = [obj for obj in objects if obj != 'person']
    if other_objects:
        other_counts = count_objects_by_type(other_objects)
        for obj_type, count in other_counts.items():
            if count == 1:
                description_parts.append(f"1 {obj_type}")
            else:
                description_parts.append(f"{count} {obj_type}s")

    if len(description_parts) == 0:
        return "The scene appears empty."
    elif len(description_parts) == 1:
        return f"I can see {description_parts[0]}."
    else:
        return f"I can see {', '.join(description_parts[:-1])} and {description_parts[-1]}."

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 enhanced_detect.py <image_file>")
        sys.exit(1)

    image_path = sys.argv[1]

    try:
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not load image")

        # Load YOLO model
        net, classes, output_layers = load_yolo_model()
        if net is None:
            raise ValueError("Could not load YOLO model")

        # Resize frame for better detection
        processed_frame = resize_frame(image)

        # Perform detection
        detection_result = detect_objects_enhanced(processed_frame, net, classes, output_layers)

        # Generate navigation instructions
        navigation = generate_navigation_instruction(
            detection_result['people_positions'],
            processed_frame.shape[1],
            processed_frame.shape[0]
        )

        # Generate scene description
        scene_description = generate_scene_description(detection_result)

        # Prepare final result
        result = {
            'success': True,
            'objects': detection_result['objects'],
            'people_count': detection_result['people_count'],
            'scene_description': scene_description,
            'navigation': navigation,
            'object_counts': count_objects_by_type(detection_result['objects']),
            'timestamp': str(np.datetime64('now'))
        }

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'objects': [],
            'people_count': 0,
            'scene_description': "I'm having trouble analyzing the scene.",
            'navigation': {'angle': 0, 'instruction': '', 'target': None}
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()