import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ChatNavbar(props: { onPress: Function }) {
  

  return (
    <View style={styles.navbar}>
      <Image source={require("../Assets/logo.png")} style={styles.logoImage} />
      <View style={styles.appName}>
        <Text style={styles.appNameText}>DynAmi Chat</Text>
      </View>
      <TouchableOpacity style={styles.chatAccess} onPress={props.onPress()}>
        <Text style={styles.chatAccessText}>X</Text>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
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
    color: '#333333',
  },
  chatAccess: {
    backgroundColor: 'orange',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  chatAccessText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
