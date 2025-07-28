import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function Navbar(props: {onPress : Function}) {

    const handleChatAccess = () => {
        console.log("Accès au chat");
    };

    return (
        <View style={styles.navbar}>
            <Image source={require("../Assets/logo.png")} style={styles.logoImage} />
            <View style={styles.appName}>
                <Text style={styles.appNameText}>DynAmi</Text>
            </View>
            <TouchableOpacity style={styles.chatAccess} onPress={props.onPress()}>
                <Text style={styles.chatAccessText}>Chat</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 6,
        backgroundColor: '#ffffff', // Couleur de fond de la barre de navigation
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc', // Couleur de la bordure inférieure
    },
    logoImage: {
        width: 60,
        height: 60,
        marginLeft: -4,
    },
    appName: {
        // Styles pour le conteneur du nom de l'application
    },
    appNameText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333', // Couleur du texte du nom de l'application
    },
    chatAccess: {
        backgroundColor: 'orange', // Couleur de fond du bouton d'accès au chat
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    chatAccessText: {
        color: 'black', // Couleur du texte du bouton d'accès au chat
        fontSize: 16,
        fontWeight: 'bold',
    },
});
