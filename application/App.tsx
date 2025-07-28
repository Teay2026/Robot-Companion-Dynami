import React, { useState } from 'react';


import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Navbar from './Components/Navbar'
import RobotDetails from './Components/RobotDetails';
import ServerDetails from './Components/ServerDetails';
import Camera from './Components/Camera';
import Deplacement from './Components/Deplacement';
import ModalChat from './Components/ModalChat';
import styles from './Styles/HomeStyles'
import Modal from "react-native-modal";
import ModalCamera from './Components/ModalCamera';

function App(): React.JSX.Element {




  const [isModalVisible, setModalVisible] = useState(false);
  const [isCameraVisible, setCameraVisible] = useState(false);

  const toggleModal = () => {
    console.log("Accès au chat");
    setModalVisible(!isModalVisible);
  };

 

  return (
    <SafeAreaView style={{height: "100%", backgroundColor: "white"}}>
      <StatusBar
        barStyle={'dark-content'}
      />

      <Navbar onPress={() => toggleModal} />
    
      <View style={styles.main}>

        <View style={styles.details}>
          <RobotDetails />
          <ServerDetails />
        </View>

        <Camera />
        <Deplacement />
          
        <Modal isVisible={isModalVisible} style={{ height: "100%", width: "100%", margin: 0, backgroundColor: "white" }}>
          <SafeAreaView style={{height: "100%"}}>
            <ModalChat onPress={() => toggleModal}/>
          </SafeAreaView>


          

        </Modal>
      </View>  
      
    </SafeAreaView>

    
  );
}

export default App;
