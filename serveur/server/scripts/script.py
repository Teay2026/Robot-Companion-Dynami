import sys
import speech_recognition as sr

def transcribe_audio(audio_file):
    recognizer = sr.Recognizer()

    with sr.AudioFile(audio_file) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
            print(text)
        except sr.UnknownValueError:
            print("Google Speech Recognition could not understand audio")
        except sr.RequestError as e:
            print("Could not request results from Google Speech Recognition service; {0}".format(e))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 script.py <audio_file>")
        sys.exit(1)

    audio_file = sys.argv[1]
    transcribe_audio(audio_file)