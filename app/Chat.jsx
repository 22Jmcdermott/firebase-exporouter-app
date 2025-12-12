import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context';
import { useTheme } from '@/context/ThemeContext';
import { getConversationMessages, sendMessage, markMessagesAsRead, getUserProfile } from '@/lib/database-service';
import { Ionicons } from '@expo/vector-icons';

const Chat = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { conversationId, recipientId, recipientName } = params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState('');
  const flatListRef = useRef(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (user && conversationId) {
      loadMessages();
      loadUserProfile();
      markMessagesAsRead(conversationId, user.uid);
    }
  }, [user, conversationId]);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile(user.uid);
      setSenderName(profile?.displayName || user.email);
    } catch (error) {
      setSenderName(user.email);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const msgs = await getConversationMessages(conversationId);
      setMessages(msgs);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage(
        user.uid,
        senderName,
        recipientId,
        recipientName,
        newMessage.trim()
      );
      
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId === user.uid;
    const showTime = index === 0 || messages[index - 1]?.senderId !== item.senderId;

    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : (isDark ? styles.otherMessageBubbleDark : styles.otherMessageBubble)
        ]}>
          {!isMyMessage && showTime && (
            <Text style={[styles.senderName, isDark && styles.senderNameDark]}>{item.senderName}</Text>
          )}
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : (isDark ? styles.otherMessageTextDark : styles.otherMessageText)
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timestamp,
            isMyMessage ? styles.myTimestamp : (isDark ? styles.otherTimestampDark : styles.otherTimestamp)
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>{recipientName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={isDark ? '#666' : '#999'}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={24} color={newMessage.trim() ? '#fff' : '#ccc'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerTitleDark: {
    color: '#fff',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#e5e5ea',
    borderBottomLeftRadius: 4,
  },
  otherMessageBubbleDark: {
    backgroundColor: '#1c1c1c',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  senderNameDark: {
    color: '#999',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  otherMessageTextDark: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
  },
  otherTimestamp: {
    color: '#666',
  },
  otherTimestampDark: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  inputContainerDark: {
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  inputDark: {
    backgroundColor: '#1c1c1c',
    color: '#fff',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default Chat;
