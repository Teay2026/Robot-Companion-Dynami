import serial
import sys
import time

ser = serial.Serial('/dev/ttyUSB0', 9600)

commande = sys.argv[1]
if commande == "avance":
    data_to_send = "mogo 1:25 2:25\r"
    
elif commande == "recule":
    data_to_send = "mogo 1:-25 2:-25\r"

elif commande == "gauche":
    data_to_send = "mogo 1:25\r"
    
elif commande == "droite":
    data_to_send = "mogo 2:25\r"
    
elif commande == "Stop":
    data_to_send = "stop\r"
  
elif data != []:
    data_to_send = "stop\r"
 
else:
    print("Commande non reconnue.")

try:
    while True:
        ser.write(data_to_send.encode('utf-8'))
        time.sleep(0.1)
    
except KeyboardInterrupt:
    ser.close()
    print("\nProgramme arrêté.")
    sys.exit()
    