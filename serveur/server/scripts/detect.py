import cv2
import numpy as np
import sys

def resize_frame(image,height = 416 ,width = 416) : 
    
    # Récupérer les dimensions de l'image d'origine
    hauteur, largeur = image.shape[:2]

    # Calculer le ratio de redimensionnement pour maintenir le rapport hauteur/largeur
    ratio = min(height / largeur, width / hauteur)

    # Calculer les nouvelles dimensions de l'image en conservant le rapport hauteur/largeur
    nouvelle_largeur = int(largeur * ratio)
    nouvelle_hauteur = int(hauteur * ratio)

    # Redimensionner l'image en conservant le rapport hauteur/largeur
    image_redimensionnee = cv2.resize(image, (nouvelle_largeur, nouvelle_hauteur))

    # Créer un arrière-plan noir de taille 416x416
    arriere_plan = 255 * np.ones((416, 416, 3), dtype=np.uint8)

    # Calculer les coordonnées pour placer l'image redimensionnée au centre de l'arrière-plan
    x_offset = (416 - nouvelle_largeur) // 2
    y_offset = (416 - nouvelle_hauteur) // 2

    # Placer l'image redimensionnée au centre de l'arrière-plan
    arriere_plan[y_offset:y_offset + nouvelle_hauteur, x_offset:x_offset + nouvelle_largeur] = image_redimensionnee

    return arriere_plan

# chargement des poids du modèle , YOLO V4
net = cv2.dnn.readNet("./scripts/yolov4.weights", "./scripts/cfg/yolov4.cfg")
classes = []
with open("./scripts/coco.names", "r") as f:
    classes = [line.strip() for line in f.readlines()]
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]


def detect_objects(frame, closest = False, low_resolution = False):
    if low_resolution : 
        frame = resize_frame(frame)

    height, width, channels = frame.shape
    Aire_init = height*width
    x_center_init = width//2

    # frame en blob format
    blob = cv2.dnn.blobFromImage(frame, 0.00392, (320, 320), (0, 0, 0), True, crop=False)
    # exemple de taille (416, 416), est (320, 320) ou (608, 608)
    # blob dans le réseau
    net.setInput(blob)
    outs = net.forward(output_layers)
    seuil = 0.6

    # Detection
    class_ids = []
    confidences = []
    boxes = []
    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            if str(classes[class_id]) != "person" :
                break
            confidence = scores[class_id]
            if confidence > seuil : 
                # détection de l'objet
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)
               
                # coordonnée de la bounding boxes
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)

                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)
                

    seuil_chevauchement = 0.8
    indexes = cv2.dnn.NMSBoxes(boxes, confidences, seuil, seuil_chevauchement) # supprime les chevauchements

    # Paramètres : 
    a_min = 0.2
    a_max = 0.7
    s = 10
    A_min = Aire_init*a_min
    A_max = Aire_init*a_max
    Sc = width//s
    
    
    if closest : 
        Max_Aire = [0,-1] 
        for i in indexes : 
            x, y, w, h = boxes[i]
            Aire_box = w*h
            if Aire_box > Max_Aire[0] and Aire_box < Aire_init: 
                Max_Aire = [w*h,i] 
                
        i = Max_Aire[1]
        x, y, w, h = boxes[i]
        label = str(classes[class_ids[i]])
        # color = (255, 255, 0)
        # cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
        #cv2.putText(frame, label, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        Aire_box = w*h
        center = w//2
        x_center = x + center
        instruction = ""
        #y_center = int(y + h/2)
        if x_center < x_center_init - Sc :
            angle = -(45 - 45 * (x_center/x_center_init))
                # print("Tourner à gauche de {} degrés".format(angle))
            
        elif x_center > x_center_init + Sc :
                angle = 45 - 45 * ((x_center_init-(x_center-x_center_init))/x_center_init)
                # print("Tourner à droite de {} degrés".format(angle))
        else :
            # print("L'humain est centré")
            angle = 0
        if Aire_box < A_min :
            # print("Avancer")
            instruction = "avance"
        elif Aire_box > A_max :
            # print("Reculer")
            instruction = "recule"
        else : 
            # print("L'humain est à la bonne distance")
            pass
                

        return '{"angle":"'+str(angle)+'", "instruction":"'+instruction+'"}'
            
    else : 
        compteur = 0
        instruction = ""
        for i in indexes :  
                compteur +=1
                x, y, w, h = boxes[i]
                label = str(classes[class_ids[i]])
                # color = (255, 255, 0)
                # cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                #cv2.putText(frame, label, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
                print("\nHumain "+str(compteur))
                Aire_box = w*h
                center = w//2
                x_center = x + center
                #y_center = int(y + h/2)
                if x_center < x_center_init - Sc :
                    angle = -(45 - 45 * (x_center/x_center_init))
                    # print("Tourner à gauche de {} degrés".format(angle))
            
                elif x_center > x_center_init + Sc :
                    angle = 45 - 45 * ((x_center_init-(x_center-x_center_init))/x_center_init)
                    # print("Tourner à droite de {} degrés".format(angle))
                else :
                    # print("L'humain est centré")
                    angle = 0
                if Aire_box < A_min :
                    # print("Avancer")
                    instruction = "avance"
                elif Aire_box > A_max :
                    # print("Reculer")
                    instruction = "recule"
                else : 
                    # print("L'humain est à la bonne distance")
                    pass
                

    return '{"angle":"'+str(angle)+'", "instruction":"'+instruction+'"}'

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 detect.py <image_file>")
        sys.exit(1)

    image = cv2.imread(sys.argv[1])
    print(detect_objects(image, True, False))