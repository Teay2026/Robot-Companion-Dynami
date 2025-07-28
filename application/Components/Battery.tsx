import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const BatteryIcon = () => {
    let level = 0.93;
    const batteryColor = level >= 0.75 ? 'limegreen': level >= 0.5 ? 'yellow' : level >= 0.25 ? 'orange' : 'red';

    return (
        <View style={{ width: 50, height: 20, position: 'relative' }}>
            <View style={styles.batterybase}>
                <Text style={styles.text}>{`${Math.round(level * 100)}%`}</Text>
                <View style={[styles.batterydisplay, {backgroundColor: batteryColor}, {width: `${level*100}%`}]} />
            </View>
            <View style={styles.little} />
        </View>

    );
};


export default BatteryIcon;

const styles = StyleSheet.create({
    batterybase: {
        backgroundColor: 'gray',
        width: '100%',
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
        borderRadius: 5,

    },
    batterydisplay: {
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 1,
        borderRadius: 5,
    },
    little:{
        backgroundColor: 'gray',
        width: 4,
        height: 12,
        position: 'absolute',
        right: -3,
        top: 4,
      },
    text: {
        position: 'absolute',
        color: 'black',
        left: 5,
        top: 3,
        zIndex: 2,
        fontSize: 10,
        fontWeight: 'bold',
    },
});
