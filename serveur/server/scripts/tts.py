from gtts import gTTS
import sys

OUTPUT_PATH = "output.mp3"

if len(sys.argv) < 2:
 print("Usage: python3 tts.py 'votre texte ici'")
 sys.exit(1)

text = sys.argv[1]
language = 'fr'
  
inference = gTTS(text=text, lang=language, slow=False) 

inference.save(OUTPUT_PATH)

print(OUTPUT_PATH)