// Composant situé au sous les composants de détails qui montre la caméra en direct et un appuie dessus ouvre la camera en grand sur l'application

import React, {useEffect, useState} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image,  } from 'react-native';
import ModalCamera from './ModalCamera';
import io from 'socket.io-client';
import API_URL from './Global';




export default function Camera() {
    const [isCameraVisible, setCameraVisible] = useState(false);

    const handleFullScreenCamera = () => {
        setCameraVisible(!isCameraVisible);
    }

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
        <>
        
        <TouchableOpacity onPress={handleFullScreenCamera} style={styles.container}>
            
            
            <Image source={{ uri: videoFrame }} style={ styles.video } />
            
        </TouchableOpacity>

        <ModalCamera handleCamera={handleFullScreenCamera} isVisible={isCameraVisible} />
        
        
        </>
        
    );
}

const styles = StyleSheet.create({
    container: {
        height: 200,
        width: "100%",
        backgroundColor: 'darkgrey',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        padding: 14,
    },
    

    video: {
        height: '115%',
        width: '110%',
        borderRadius: 20,
        
    },
});
