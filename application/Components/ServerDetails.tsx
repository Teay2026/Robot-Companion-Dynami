// Composant situé sous la nav bar (moitié droite de l'écran) qui indique les divers infos du serveur comme son état, indicateur on/off...

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { testServerConnectivity } from './Global';


export default function ServerDetails() {
    
    // Récupération de l'état du serveur
    useEffect(() => {
        const intervalId = setInterval(() => {
          testServerConnectivity().then((result) => {
            setServerIndicator(result);
          });
        }, 1000 * 5) // in milliseconds => 5 secondes
        return () => clearInterval(intervalId)
      }, [])
    
    
    const [serverIndicator, setServerIndicator] = useState(false); // Indicateur du serveur

   
    

   
    
    
    const serverStatus = serverIndicator ? 'En ligne' : 'Hors ligne'; // Etat du serveur

    return (
        <View style={styles.container}>
            <Text style={styles.infoText}>État du serveur: {serverStatus}</Text>
            <Text>Indicateur:
                <Text style={serverIndicator ? styles.greenColor : styles.redColor }>{serverIndicator ? ' On' : ' Off'}</Text>
                </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0', // Couleur de fond du composant
        borderRadius: 20,
        padding: 14,
    },
    infoText: {
        fontSize: 18,
        marginBottom: 10,
    },
    redColor: {
        color: 'red',
    },
    greenColor: {
        color: 'green',
    },
});



