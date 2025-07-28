import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatMessage(props: { message: string; isUser?: boolean; isBot?: boolean }) {
  const containerStyle = [
    styles.chatMessageContainer,
    props.isUser && styles.userChatMessageContainer,
    props.isBot && styles.botChatMessageContainer,
  ];

  const label = props.isBot ? 'DynAmi' : 'You';

  return (
    <View style={containerStyle}>
      {props.isUser && <Text style={styles.userLabel}>You</Text>}
      {props.isBot && <Text style={styles.botLabel}>{label}</Text>}
      <Text style={styles.chatMessageText}>{props.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chatMessageContainer: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'orange',
    marginVertical: 5,
    marginRight: 10,
    marginLeft: 10,
    maxWidth: '70%',
  },
  userChatMessageContainer: {
    backgroundColor: 'lightgray',
    alignSelf: 'flex-end',
  },
  botChatMessageContainer: {
    backgroundColor: 'orange',
    alignSelf: 'flex-start',
  },
  chatMessageText: {
    fontSize: 16,
    color: 'black',
  },
  userLabel: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 5,
  },
  botLabel: {
    fontSize: 12,
    color: 'white',
    marginBottom: 5,
  },
});
