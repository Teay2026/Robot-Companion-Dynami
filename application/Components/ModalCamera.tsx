import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Text, Dimensions, Image } from 'react-native';


import API_URL from './Global';
import io from 'socket.io-client';

export default function ModalCamera(props: {handleCamera: Function, isVisible: boolean}) {
  
  const [videoFrame, setVideoFrame] = useState('null');

    function base64ArrayBuffer(arrayBuffer: Iterable<number>) {
        var base64    = '';
        var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        var bytes         = new Uint8Array(arrayBuffer);
        var byteLength    = bytes.byteLength;
        var byteRemainder = byteLength % 3;
        var mainLength    = byteLength - byteRemainder;

        var a, b, c, d;
        var chunk;

        for (var i = 0; i < mainLength; i = i + 3) {
            chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

            a = (chunk & 16515072) >> 18;
            b = (chunk & 258048)   >> 12;
            c = (chunk & 4032)     >>  6;
            d = chunk & 63;

            base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
        }

        if (byteRemainder == 1) {
            chunk = bytes[mainLength];

            a = (chunk & 252) >> 2;
            b = (chunk & 3)   << 4;

            base64 += encodings[a] + encodings[b] + '==';
        } else if (byteRemainder == 2) {
            chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

            a = (chunk & 64512) >> 10;
            b = (chunk & 1008)  >>  4;

            c = (chunk & 15)    <<  2;

            base64 += encodings[a] + encodings[b] + encodings[c] + '=';
        }

        return base64;
    }

    

    useEffect(() => {
        const socket = io(API_URL+'/cam');

        socket.on("data", (stream) => {
            var bytes = new Uint8Array(stream);
            setVideoFrame(`data:image/jpeg;base64,${base64ArrayBuffer(bytes)}`);
        });

        
 
        return () => {
            socket.disconnect();
        };
    }, []);

  
  

  return (
   
       <Modal visible={props.isVisible} animationType="slide" >
        <View style={styles.modalContainer}>
          
          <View style={styles.videoContainer}>
           

            <Image source={{ uri: videoFrame }} style={styles.video } />


          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => props.handleCamera()}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>

        </View>
      </Modal>
    
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
   

    
    
  },
  videoContainer: {
    flex: 1,
   
    
  },
  video: {
    position: 'absolute',
    top: '25%',
    left: '-58%',
    bottom: 0,
    right: 0,
    transform: [{ rotate: '90deg' }],
    height: Dimensions.get('screen').width,
    width: Dimensions.get('screen').height,


    
    
  },
  closeButton: {
    position: 'absolute',
    top: '92%',
    right: '83%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 17,
    transform: [{ rotate: '90deg' }],
    
  },
  closeButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },

  container: {
    height: 300,
    width: '100%',
    backgroundColor: 'darkgrey',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    padding: 14,

  },
  liveText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cameraContent: {
    flex: 1,
  },
});
