// Composant situé sous la nav bar (moitié gauche de l'écran) qui indique les divers infos du robot comme la batterie, l'état de la connectivité...

import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BatteryIcon from './Battery';
import { testRobotConnectivity } from './Global';

export default function RobotDetails() {
    // Récupération de l'état du serveur
    useEffect(() => {
        const intervalId = setInterval(() => {
          testRobotConnectivity().then((result) => {
            setConnectyStatus(result);
          });
        }, 1000 * 5) // in milliseconds
        return () => clearInterval(intervalId)
      }, [])
    
    
    const [connectivityStatus, setConnectyStatus] = useState(false); // Indicateur du serveur
    

    return (
        <View style={styles.container}>
            <View style={{ flexDirection: "row" }}>
                <Text style={styles.infoText}>Batterie: </Text>
                <BatteryIcon />
            </View>
            <Text style={styles.infoText}>Connectivité: {connectivityStatus ? "Connecté" : "Déconnecté"}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 14,
    },
    infoText: {
        fontSize: 18,
        marginBottom: 10,
    },
});
