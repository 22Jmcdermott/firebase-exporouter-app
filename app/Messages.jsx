import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context';
import { useTheme } from '@/context/ThemeContext';
import { getUserConversations, getAllUsers } from '@/lib/database-service';
import { Ionicons } from '@expo/vector-icons';

/**
 * Messages component - Main messaging interface for user conversations
 * Displays list of active conversations with unread counts and timestamps
 */
const Messages = () => {
  // Authentication and navigation hooks
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  // Component state
  const [conversations, setConversations] = useState([]); // List of user's conversations
  const [loading, setLoading] = useState(true); // Loading state for initial data fetch
  const [showNewMessage, setShowNewMessage] = useState(false); // Toggle for new message modal
  const [allUsers, setAllUsers] = useState([]); // List of all users for starting new conversations

  const isDark = theme === 'dark';

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convos = await getUserConversations(user.uid);
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await getAllUsers();
      // Filter out current user
      setAllUsers(users.filter(u => u.userId !== user.uid));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  /**
   * Initiates the new message flow
   * Loads available users and displays the user selection modal
   */
  const handleNewMessage = async () => {
    await loadUsers();
    setShowNewMessage(true);
  };

  /**
   * Starts a new conversation with a selected user
   * Creates a unique conversation ID and navigates to the Chat screen
   * @param {string} recipientId - ID of the user to message
   * @param {string} recipientName - Display name of the recipient
   */
  const startConversation = (recipientId, recipientName) => {
    const conversationId = [user.uid, recipientId].sort().join('_');
    router.push({
      pathname: '/Chat',
      params: {
        conversationId,
        recipientId,
        recipientName
      }
    });
    setShowNewMessage(false);
  };

  /**
   * Opens an existing conversation from the conversation list
   * Extracts recipient information and navigates to Chat screen
   * @param {Object} conversation - Conversation object with participants and metadata
   */
  const openConversation = (conversation) => {
    const otherUserId = conversation.participants.find(p => p !== user.uid);
    const otherUserName = conversation.participantNames[otherUserId];
    
    router.push({
      pathname: '/Chat',
      params: {
        conversationId: conversation.id,
        recipientId: otherUserId,
        recipientName: otherUserName
      }
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversation = ({ item }) => {
    const otherUserId = item.participants.find(p => p !== user.uid);
    const otherUserName = item.participantNames[otherUserId];
    const unread = item.unreadCount?.[user.uid] || 0;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isDark && styles.conversationItemDark]}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatar, isDark && styles.avatarDark]}>
          <Text style={styles.avatarText}>{otherUserName?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, isDark && styles.userNameDark]}>{otherUserName}</Text>
            <Text style={[styles.time, isDark && styles.timeDark]}>{formatTime(item.lastMessageTime)}</Text>
          </View>
          <View style={styles.messageRow}>
            <Text 
              style={[styles.lastMessage, isDark && styles.lastMessageDark, unread > 0 && styles.unreadMessage]} 
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.userItem, isDark && styles.userItemDark]}
      onPress={() => startConversation(item.userId, item.displayName || item.email)}
    >
      <View style={[styles.avatar, isDark && styles.avatarDark]}>
        <Text style={styles.avatarText}>{(item.displayName || item.email)?.[0]?.toUpperCase()}</Text>
      </View>
      <Text style={[styles.userName, isDark && styles.userNameDark]}>
        {item.displayName || item.email}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (showNewMessage) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={() => setShowNewMessage(false)}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>New Message</Text>
        </View>
        <FlatList
          data={allUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.list}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Messages</Text>
        <TouchableOpacity onPress={handleNewMessage}>
          <Ionicons name="create-outline" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
      {conversations.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>No messages yet</Text>
          <TouchableOpacity style={styles.newMessageButton} onPress={handleNewMessage}>
            <Text style={styles.newMessageButtonText}>Start a conversation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
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
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerTitleDark: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  conversationItemDark: {
    backgroundColor: '#1c1c1c',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  userItemDark: {
    backgroundColor: '#1c1c1c',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarDark: {
    backgroundColor: '#0056b3',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  userNameDark: {
    color: '#fff',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  timeDark: {
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  lastMessageDark: {
    color: '#999',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyTextDark: {
    color: '#999',
  },
  newMessageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newMessageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Messages;
