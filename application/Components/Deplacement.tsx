import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal} from 'react-native';
import API_URL from './Global';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faBullhorn } from '@fortawesome/free-solid-svg-icons';



export default function Deplacement() {
    const [isActive, setIsActive] = useState(true);

    const [isTextVisible, setIsTextVisible] = useState(true); // clignotemment du text

    useEffect(() => {
        const interval = setInterval(() => {
            setIsTextVisible(prevState => !prevState);
        }, 300); 

        
        return () => clearInterval(interval);
    }, []);

 
    const handleMove = async (direction: string) => {
        console.log(`Déplacement du robot : ${direction}`);
        await fetch(API_URL + "/api/move", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction, }),
        });
    };

    const handleMoveOut = async () => {
        console.log(`Arrêter le déplacement`);
        await fetch(API_URL + "/api/move", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction: "Stop", }),
        });
    };

    const handleAutoPilot = async () => {
        console.log("Pilotage automatique");
        setIsActive(!isActive);
        await fetch(API_URL + "/api/autopilot", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ autoPilot: isActive, }),
        });
    };

    //Boolean qui indique si on appuie sur le Honk ou non
    const [honk, setHonk] = useState(false);

    
    const handleHonk = async () => {
        setHonk(!honk);
        console.log('HONK');
        await fetch(API_URL + '/api/honk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({honk: "Honk"}),
        });
    };

    // on récupère en cas de détection de collision un message du server
    const [collision, setCollision] = useState(false);

    const detectCollision = async () => {
        await fetch(API_URL + '/api/collision', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        }).then((response) => response.json())
        .then((data) => {
            if (data.collision === true) {
                setCollision(true);
            }
            else {
                setCollision(false);
            }
        });
    }

    useEffect(() => {
        const interval = setInterval(detectCollision, 1500);
    
        // This function will be called when the component unmounts
        return () => {
            clearInterval(interval);
        };
    }, []);
    

 

    return (
        <View style={styles.container}>
            <View style={styles.pad}>
                <TouchableOpacity disabled={collision} onPressIn={() => handleMove('avance')} onPressOut={() => handleMoveOut()} style={[styles.buttonTop, styles.button]}>
                    <Text style={styles.arrowText}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPressIn={() => handleMove('gauche')} onPressOut={() => handleMoveOut()} style={[styles.buttonLeft, styles.button]}>
                    <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity onPressIn={() => handleMove('droite')} onPressOut={() => handleMoveOut()} style={[styles.buttonRight, styles.button]}>
                    <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
                <TouchableOpacity onPressIn={() => handleMove('recule')} onPressOut={() => handleMoveOut()} style={[styles.buttonBottom, styles.button]}>
                    <Text style={styles.arrowText}>▼</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPressIn={() => handleHonk()} onPressOut={() => setHonk(false)} style={isActive ? styles.honkActive : styles.honkInactive}>
                <FontAwesomeIcon icon={faBullhorn} size={24} color="black" />
            </TouchableOpacity>

            <View style={honk ? styles.honkbarsTrue : styles.honkbarsFalse}>
                <View style={styles.honkbar1}></View>
                <View style={styles.honkbar2}></View>
                <View style={styles.honkbar3}></View>
            </View>

            <TouchableOpacity onPress={handleAutoPilot} style={isActive ? styles.buttonActive : styles.buttonInactive}>
                <Text style={isActive ? styles.textActive : styles.textInactive}>Auto Pilot</Text>
            </TouchableOpacity>

            <Modal visible={collision} transparent={true}>
            <Text style={[styles.warningText, {opacity: isTextVisible ? 1 : 0}]}>Attention, collision imminente !</Text>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 14,
        borderRadius: 20,
        flex: 1,
    },
    pad: {
        position: "relative",
        width: "100%",
        height: 150,
    },
    button: {
        backgroundColor: 'orange',
        borderRadius: 30,
        width: 60,
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
    },
    buttonTop: {
        top: 0,
        left: "42%",
    },
    buttonLeft: {
        left: "22%",
        top: "32%",
    },
    buttonRight: {
        right: "22%",
        top: "32%",
    },
    buttonBottom: {
        bottom: 0,
        left: "42%",
    },
    arrowText: {
        fontSize: 24,
        color: 'black',
    },
    buttonActive: {
        position: "absolute",
        right: 10,
        bottom: 10,
        backgroundColor: 'orange',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    buttonInactive: {
        position: "absolute",
        right: 10,
        bottom: 10,
        backgroundColor: 'darkgrey',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    textActive: {
        fontSize: 16,
        color: 'black',
    },
    textInactive: {
        fontSize: 16,
        color: 'white',
    },
    honkActive: {
        position: "absolute",
        left: 10,
        bottom: 10,
        backgroundColor: 'orange',
        width: 60,
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 30,
        borderRadius: 20,
    },
    honkInactive: {
        position: "absolute",
        left: 10,
        bottom: 10,
        backgroundColor: 'orange',
        width: 60,
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 30,
        borderRadius: 20,
    },

    honkbarsTrue: {
        right: "32%",
        bottom: 18,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        width: 60,
        backgroundColor: 'transparent',
        opacity: 1,
    },

    honkbarsFalse: {
        display: 'none',
        opacity: 0,
    },


    honkbar1: {
        width: 25,
        height: 3,
        backgroundColor: 'black',
        margin: 6,
        transform: [{ rotate: '-45deg' }],
    },

    honkbar2: {
        width: 25,
        height: 3,
        backgroundColor: 'black',
        margin: 6,
        marginLeft: 15,
    },

    honkbar3: {
        width: 25,
        height: 3,
        backgroundColor: 'black',
        margin: 6,
        transform: [{ rotate: '45deg' }],
    },

    warningText:{
        color: 'red',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: '170%',
        marginLeft: '10%',
        
      
    }
});
