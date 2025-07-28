import React, { useState, useRef, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import ChatNavbar from './ChatNavbar';
import ChatMessage from './ChatMessage';
import API_URL from './Global';
import WaitingResponse from './WaitingResponse';

export default function ModalChat(props: {onPress : Function}) {
    const [messages, setMessages] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const scrollViewRef = useRef<ScrollView>(null); 
    const [typing, setTyping] = useState(false);
    const [scrolling, setScrolling] = useState(false);


    useEffect(() => {
       
        scrollViewRef.current?.scrollToEnd({ animated: true });
        console.log("je scroll"); 
       
    }, [messages, scrolling]);


    const handleSendMessage = async () => {
        console.log("Message envoyé: " + inputValue);
        setScrolling(true);
        setScrolling(false);
       
        // Add the new message to the state
        setMessages( (prevMessages) =>  {
            const newMessages = [...prevMessages, inputValue];
            return newMessages;
          });
          setInputValue('');


        // Send the user's message to the API
        setTyping(true);
        const response = await fetch(API_URL + "/api/chat", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: inputValue, }),
        }).then((data) => data.text());
        setTyping(false);
        setScrolling(true);
        setScrolling(false);
        console.log(response);
        
        
        setMessages((prevMessages) => [...prevMessages, response]);

        
       
    };

    
   

    return (
        <KeyboardAvoidingView style={{ height: "100%", width: "100%" }} enabled={true} behavior="padding">
            <ChatNavbar onPress={props.onPress} />
            
            <View style={{ flex: 1, backgroundColor: "white" }}>
                <View style={styles.chatContent}>
                     <ScrollView ref={scrollViewRef} style={styles.chatContent}>
                       
                        {messages.map((message, index) => (  
                            <ChatMessage key={index} message={message} isUser={index % 2 === 0} isBot={index % 2 === 1} /> 
                            
                        ))}
                        {typing ? <WaitingResponse/>: ""}
                        
                     </ScrollView>
                </View>
                <View style={styles.textBox}>
                    <TextInput style={styles.textInput} 
                                    placeholder="En quoi puis-je t'aider ?" 
                                    multiline={true} 
                                    placeholderTextColor={'gray'}
                                    value={inputValue}
                                    onChangeText={setInputValue}
                    />


                    <Pressable style={typing ? styles.sendBtnDisabled : styles.sendBtn} onPress={!typing ? handleSendMessage : undefined}>   
                        <Text style={{ fontSize: 30, fontWeight: "bold", justifyContent: 'center', alignItems: 'center',}}>{typing ?  '□' : ' ⤴' }</Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    textBox: {
        flexDirection: "row",
        width: "100%",
        minHeight: 50,
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#cccccc',
        padding: 12, 
    },
    textInput: {
        height: "100%",
        flex: 1,
        fontSize: 24,
        
    },
    sendBtn: {
        justifyContent: "center",
        alignItems: "center",
        width: 50,
        backgroundColor: "orange",
        borderRadius: 10,
        height: 50,
        
    },
    sendBtnDisabled: {
        justifyContent: "center",
        alignItems: "center",
        width: 50,
        backgroundColor: "darkgrey",
        borderRadius: 10,
        height: 50,
    },
    chatContent: {
        flex: 1,
        
    },
});