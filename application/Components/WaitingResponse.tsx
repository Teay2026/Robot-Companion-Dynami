import { text } from '@fortawesome/fontawesome-svg-core';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';




const WaitingResponse = () => {
    


    // Animation du texte "En attente de réponse"
    const [text, setText] = useState('En attente de réponse .');
    useEffect(() => {
        
        const interval = setInterval(() => {
            if (text === 'En attente de réponse .') {
                setText('En attente de réponse ..');
            
            } else if (text === 'En attente de réponse ..') {
                setText('En attente de réponse ...');
            }
            else if (text === 'En attente de réponse ...') {
                setText('En attente de réponse .');
            
            }

        }, 300);
        return () => clearInterval(interval);
    }, [text]);

    

    return (
        <View style={styles.container}>
            <Text style={styles.botInscription}>Dynami</Text>
            <Text style={styles.infoText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: 'orange',
        marginVertical: 5,
        marginLeft: 10,
        maxWidth: '60%',
        maxHeight: '40%',
        
    },
    infoText: {
        fontSize: 18,
        marginBottom: 10,
    },
    botInscription: {
        fontSize: 12,
        color: 'white',
    },
});


export default WaitingResponse;