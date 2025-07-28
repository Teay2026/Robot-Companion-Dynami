import serial 

ser = serial.Serial('/dev/ttyUSB0', 9600)

while True:
    data = ser.readline(32).decode('utf-8').strip()
    if data != "":
        print(data)