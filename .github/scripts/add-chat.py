from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text()

# useRef for unread notification tracking.
s = s.replace(
    "import { useCallback, useEffect, useMemo, useState } from 'react';",
    "import { useCallback, useEffect, useMemo, useRef, useState } from 'react';",
    1,
)

# Chat data types.
anchor = "type Paginated<T> = { data: T[] };\n"
block = """type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  read_at?: string | null;
  created_at?: string;
  sender?: User;
};
type Conversation = {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  last_message_at?: string | null;
  listing?: Listing;
  buyer?: User;
  seller?: User;
  last_message?: ChatMessage | null;
  unread_count?: number;
};
type MessageNotification = ChatMessage & { conversation?: Conversation };
"""
if block not in s:
    s = s.replace(anchor, anchor + block, 1)

# Helpers and chat panels before EmptyScreen.
marker = "function EmptyScreen({ icon, title, text }: { icon: any; title: string; text: string }) {\n"
component = r'''function conversationOtherName(conversation: Conversation, userId: number) {
  return conversation.buyer_id === userId ? conversation.seller?.name || 'المعلن' : conversation.buyer?.name || 'المستخدم';
}

function MessagesPanel({ token, userId, onOpen }: { token: string; userId: number; onOpen: (conversation: Conversation) => void }) {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setRows(await request<Conversation[]>('/conversations', {}, token)); }
    catch (e) { Alert.alert('الرسائل', e instanceof Error ? e.message : 'تعذر تحميل المحادثات.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) return <View style={styles.chatCenter}><ActivityIndicator color={PURPLE} /><Text style={styles.stateText}>جاري تحميل المحادثات...</Text></View>;
  if (!rows.length) return <EmptyScreen icon="chatbubble-ellipses-outline" title="لا توجد محادثات" text="افتح أي إعلان واضغط «مراسلة المعلن» لبدء المحادثة." />;

  return (
    <ScrollView contentContainerStyle={styles.chatListPage}>
      {rows.map((row) => {
        const uri = imageUrl(row.listing?.images?.[0]);
        const unread = Number(row.unread_count || 0);
        return (
          <Pressable key={row.id} style={styles.conversationCard} onPress={() => onOpen(row)}>
            {uri ? <Image source={{ uri }} style={styles.conversationImage} resizeMode={row.listing?.images?.[0]?.processed_url ? 'contain' : 'cover'} /> : <View style={styles.conversationImagePlaceholder}><Ionicons name="image-outline" size={24} color="#A59CAB" /></View>}
            <View style={styles.conversationInfo}>
              <View style={styles.conversationTitleRow}>
                {unread > 0 ? <View style={styles.unreadPill}><Text style={styles.unreadPillText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
                <Text numberOfLines={1} style={styles.conversationName}>{conversationOtherName(row, userId)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.conversationListing}>{row.listing?.title || 'إعلان'}</Text>
              <Text numberOfLines={1} style={[styles.conversationLast, unread > 0 && styles.conversationLastUnread]}>{row.last_message?.body || 'ابدأ المحادثة'}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ChatPanel({ token, userId, conversation, onBack, onUnreadChanged }: { token: string; userId: number; conversation: Conversation; onBack: () => void; onUnreadChanged: () => void }) {
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<Conversation>(conversation);

  const load = useCallback(async () => {
    try {
      const data = await request<{ conversation: Conversation; messages: ChatMessage[] }>(`/conversations/${conversation.id}/messages`, {}, token);
      setRows(Array.isArray(data.messages) ? data.messages : []);
      if (data.conversation) setMeta(data.conversation);
      onUnreadChanged();
    } catch (e) {
      Alert.alert('المحادثة', e instanceof Error ? e.message : 'تعذر تحميل الرسائل.');
    } finally { setLoading(false); }
  }, [conversation.id, token, onUnreadChanged]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await request<ChatMessage>(`/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }, token);
      setRows((current) => [...current, message]);
      setDraft('');
    } catch (e) { Alert.alert('تعذر الإرسال', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.'); }
    finally { setSending(false); }
  };

  return (
    <View style={styles.chatPage}>
      <View style={styles.chatHeader}>
        <Pressable style={styles.chatBack} onPress={onBack}><Ionicons name="arrow-forward" size={23} color={PURPLE} /></Pressable>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{conversationOtherName(meta, userId)}</Text>
          <Text numberOfLines={1} style={styles.chatHeaderListing}>{meta.listing?.title || 'الإعلان'}</Text>
        </View>
        <View style={styles.chatAvatar}><Ionicons name="person" size={21} color={PURPLE} /></View>
      </View>
      {loading ? <View style={styles.chatCenter}><ActivityIndicator color={PURPLE} /></View> : (
        <ScrollView contentContainerStyle={styles.messagesScroll} keyboardShouldPersistTaps="handled">
          {rows.length ? rows.map((message) => {
            const mine = message.sender_id === userId;
            return (
              <View key={message.id} style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
                <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                  <Text style={[styles.messageText, mine && styles.messageTextMine]}>{message.body}</Text>
                  <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{relativeTime(message.created_at)}</Text>
                </View>
              </View>
            );
          }) : <Text style={styles.chatStartHint}>ابدأ المحادثة حول هذه السلعة.</Text>}
        </ScrollView>
      )}
      <View style={styles.messageComposer}>
        <Pressable style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]} onPress={send} disabled={!draft.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
        </Pressable>
        <TextInput value={draft} onChangeText={setDraft} placeholder="اكتب رسالة للمعلن..." multiline style={styles.messageInput} textAlign="right" />
      </View>
    </View>
  );
}

function NotificationsPanel({ token, userId, onOpen }: { token: string; userId: number; onOpen: (conversation: Conversation) => void }) {
  const [rows, setRows] = useState<MessageNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setRows(await request<MessageNotification[]>('/message-notifications', {}, token)); }
    catch (e) { Alert.alert('الإشعارات', e instanceof Error ? e.message : 'تعذر تحميل الإشعارات.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); const timer = setInterval(() => void load(), 5000); return () => clearInterval(timer); }, [load]);

  if (loading) return <View style={styles.chatCenter}><ActivityIndicator color={PURPLE} /><Text style={styles.stateText}>جاري تحميل الإشعارات...</Text></View>;
  if (!rows.length) return <EmptyScreen icon="notifications-outline" title="لا توجد إشعارات" text="عند وصول رسالة جديدة على أحد إعلاناتك ستظهر هنا." />;

  return (
    <ScrollView contentContainerStyle={styles.chatListPage}>
      {rows.map((item) => {
        const conversation = item.conversation;
        if (!conversation) return null;
        const unread = !item.read_at;
        return (
          <Pressable key={item.id} style={[styles.notificationCard, unread && styles.notificationCardUnread]} onPress={() => onOpen(conversation)}>
            <View style={[styles.notificationIcon, unread && styles.notificationIconUnread]}><Ionicons name="chatbubble-ellipses" size={21} color={unread ? '#fff' : PURPLE} /></View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>{conversationOtherName(conversation, userId)} أرسل لك رسالة</Text>
              <Text numberOfLines={1} style={styles.notificationListing}>{conversation.listing?.title || 'الإعلان'}</Text>
              <Text numberOfLines={2} style={styles.notificationBody}>{item.body}</Text>
              <Text style={styles.notificationTime}>{relativeTime(item.created_at)}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

'''
if component not in s:
    if marker not in s:
        raise SystemExit('EmptyScreen marker not found')
    s = s.replace(marker, component + marker, 1)

# App state.
anchor = "  const [manageBusyId, setManageBusyId] = useState<number | null>(null);\n"
state_block = """  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const unreadBaseline = useRef<number | null>(null);
"""
if state_block not in s:
    s = s.replace(anchor, anchor + state_block, 1)

# Unread polling after auth restore effect.
marker = "  useEffect(() => {\n    if (screen !== 'mine' || !token) return;\n"
poll_block = r'''  const loadUnreadMessages = useCallback(async () => {
    if (!token) { setUnreadMessages(0); return; }
    try {
      const data = await request<{ count: number }>('/messages/unread-count', {}, token);
      const next = Number(data?.count || 0);
      if (unreadBaseline.current !== null && next > unreadBaseline.current && screen !== 'messages') {
        Alert.alert('رسالة جديدة', 'وصلتك رسالة جديدة في مستعمل مجاني.');
      }
      unreadBaseline.current = next;
      setUnreadMessages(next);
    } catch {}
  }, [token, screen]);

  useEffect(() => {
    if (!token) { unreadBaseline.current = null; setUnreadMessages(0); return; }
    void loadUnreadMessages();
    const timer = setInterval(() => void loadUnreadMessages(), 5000);
    return () => clearInterval(timer);
  }, [token, loadUnreadMessages]);

'''
if poll_block not in s:
    if marker not in s:
        raise SystemExit('mine effect marker not found')
    s = s.replace(marker, poll_block + marker, 1)

# Start conversation helper before loggedIn.
marker = "  const loggedIn = (nextToken: string, nextUser: User) => {\n"
helper = r'''  const startConversationForListing = async (item: Listing) => {
    if (!token) {
      Alert.alert('تسجيل الدخول', 'سجّل الدخول أولاً حتى تتمكن من مراسلة المعلن.', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الدخول', onPress: () => { setDetail(null); setScreen('account'); } },
      ]);
      return;
    }
    try {
      const conversation = await request<Conversation>(`/listings/${item.id}/conversation`, { method: 'POST' }, token);
      setActiveConversation(conversation);
      setDetail(null);
      setScreen('messages');
      void loadUnreadMessages();
    } catch (e) { Alert.alert('المحادثة', e instanceof Error ? e.message : 'تعذر بدء المحادثة.'); }
  };

'''
if helper not in s:
    if marker not in s:
        raise SystemExit('loggedIn marker not found')
    s = s.replace(marker, helper + marker, 1)

# Clear chat on logout.
s = s.replace(
    "    setEditReturnDetailId(null);\n    setScreen('home');\n  };\n",
    "    setEditReturnDetailId(null);\n    setActiveConversation(null);\n    setUnreadMessages(0);\n    unreadBaseline.current = null;\n    setScreen('home');\n  };\n",
    1,
)

# Seller contact button in listing detail before owner controls.
marker = "\n            {isOwner ? (\n"
contact = r'''
            {!isOwner && detail.user ? (
              <Pressable style={styles.contactSellerButton} onPress={() => void startConversationForListing(detail)}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                <Text style={styles.contactSellerText}>مراسلة المعلن</Text>
              </Pressable>
            ) : null}
'''
if contact not in s:
    if marker not in s:
        raise SystemExit('detail owner marker not found')
    s = s.replace(marker, contact + marker, 1)

# Replace empty messages/notifications screens.
s = s.replace(
    "  if (screen === 'notifications') content = <EmptyScreen icon=\"notifications-outline\" title=\"الإشعارات\" text=\"ستظهر هنا تحديثات إعلاناتك وطلبات المشترين عند ربط خدمة الإشعارات.\" />;\n  if (screen === 'messages') content = <EmptyScreen icon=\"chatbubble-ellipses-outline\" title=\"الرسائل\" text=\"واجهة الرسائل جاهزة في الشريط، وسيتم ربط المحادثات بقاعدة البيانات لاحقًا.\" />;",
    "  if (screen === 'notifications') content = token && user ? <NotificationsPanel token={token} userId={user.id} onOpen={(conversation) => { setActiveConversation(conversation); setScreen('messages'); }} /> : <LoginPanel onLogin={loggedIn} />;\n  if (screen === 'messages') content = token && user ? (activeConversation ? <ChatPanel token={token} userId={user.id} conversation={activeConversation} onBack={() => { setActiveConversation(null); void loadUnreadMessages(); }} onUnreadChanged={() => void loadUnreadMessages()} /> : <MessagesPanel token={token} userId={user.id} onOpen={(conversation) => setActiveConversation(conversation)} />) : <LoginPanel onLogin={loggedIn} />;",
    1,
)

# Home top button should also clear active chat when switching screens? Bottom messages retains current chat by design.
# Add badge wrappers to bottom messages and notifications.
s = s.replace(
    "        <Pressable style={styles.bottomItem} onPress={() => setScreen('messages')}><Ionicons name={screen === 'messages' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={screen === 'messages' ? PURPLE : '#7C7783'} /><Text style={[styles.bottomLabel, screen === 'messages' && styles.bottomLabelActive]}>الرسائل</Text></Pressable>\n        <Pressable style={styles.bottomItem} onPress={() => setScreen('notifications')}><Ionicons name={screen === 'notifications' ? 'notifications' : 'notifications-outline'} size={24} color={screen === 'notifications' ? PURPLE : '#7C7783'} /><Text style={[styles.bottomLabel, screen === 'notifications' && styles.bottomLabelActive]}>الإشعارات</Text></Pressable>",
    "        <Pressable style={styles.bottomItem} onPress={() => setScreen('messages')}><View style={styles.bottomIconWrap}><Ionicons name={screen === 'messages' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={screen === 'messages' ? PURPLE : '#7C7783'} />{unreadMessages > 0 ? <View style={styles.bottomBadge}><Text style={styles.bottomBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View> : null}</View><Text style={[styles.bottomLabel, screen === 'messages' && styles.bottomLabelActive]}>الرسائل</Text></Pressable>\n        <Pressable style={styles.bottomItem} onPress={() => setScreen('notifications')}><View style={styles.bottomIconWrap}><Ionicons name={screen === 'notifications' ? 'notifications' : 'notifications-outline'} size={24} color={screen === 'notifications' ? PURPLE : '#7C7783'} />{unreadMessages > 0 ? <View style={styles.bottomBadge}><Text style={styles.bottomBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View> : null}</View><Text style={[styles.bottomLabel, screen === 'notifications' && styles.bottomLabelActive]}>الإشعارات</Text></Pressable>",
    1,
)

# Chat styles before bottomBar.
style_marker = "  bottomBar: {"
styles = r'''  contactSellerButton: { width: '100%', minHeight: 52, marginTop: 14, borderRadius: 14, backgroundColor: PURPLE, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  contactSellerText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  chatListPage: { padding: 12, paddingBottom: 24, backgroundColor: SURFACE, flexGrow: 1 },
  chatCenter: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: SURFACE },
  conversationCard: { minHeight: 92, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', padding: 10, marginBottom: 9, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  conversationImage: { width: 68, height: 68, borderRadius: 12, backgroundColor: '#FAFAFA' },
  conversationImagePlaceholder: { width: 68, height: 68, borderRadius: 12, backgroundColor: '#F1EDF5', alignItems: 'center', justifyContent: 'center' },
  conversationInfo: { flex: 1, alignItems: 'flex-end' },
  conversationTitleRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  conversationName: { color: TEXT, fontSize: 15, fontWeight: '900', textAlign: 'right', flex: 1 },
  conversationListing: { color: PURPLE, fontSize: 11, fontWeight: '800', marginTop: 3, textAlign: 'right' },
  conversationLast: { color: MUTED, fontSize: 12, marginTop: 6, textAlign: 'right' },
  conversationLastUnread: { color: TEXT, fontWeight: '900' },
  unreadPill: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#DC2626', paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  unreadPillText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  chatPage: { flex: 1, backgroundColor: '#F7F5FA' },
  chatHeader: { minHeight: 72, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  chatBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  chatHeaderInfo: { flex: 1, alignItems: 'flex-end' },
  chatHeaderName: { color: TEXT, fontWeight: '900', fontSize: 15 },
  chatHeaderListing: { color: MUTED, fontSize: 11, marginTop: 2, maxWidth: 230 },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  messagesScroll: { padding: 12, paddingBottom: 20, flexGrow: 1 },
  bubbleRow: { width: '100%', marginBottom: 8 },
  bubbleRowMine: { alignItems: 'flex-start' },
  bubbleRowOther: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '82%', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 9 },
  messageBubbleMine: { backgroundColor: PURPLE, borderBottomLeftRadius: 5 },
  messageBubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderBottomRightRadius: 5 },
  messageText: { color: TEXT, fontSize: 14, lineHeight: 21, textAlign: 'right' },
  messageTextMine: { color: '#fff' },
  messageTime: { color: '#9B94A2', fontSize: 9, marginTop: 4, textAlign: 'left' },
  messageTimeMine: { color: '#E7DBFF' },
  chatStartHint: { color: MUTED, textAlign: 'center', marginTop: 35, fontSize: 13 },
  messageComposer: { minHeight: 68, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageInput: { flex: 1, minHeight: 48, maxHeight: 110, borderRadius: 18, backgroundColor: '#F4F1F6', paddingHorizontal: 14, paddingVertical: 11, color: TEXT, fontSize: 14 },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  notificationCard: { minHeight: 108, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', padding: 12, marginBottom: 9, flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' },
  notificationCardUnread: { borderColor: '#CDB5F0', backgroundColor: '#FBF8FF' },
  notificationIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  notificationIconUnread: { backgroundColor: PURPLE },
  notificationInfo: { flex: 1, alignItems: 'flex-end' },
  notificationTitle: { color: TEXT, fontSize: 14, fontWeight: '900', textAlign: 'right' },
  notificationListing: { color: PURPLE, fontSize: 11, fontWeight: '800', marginTop: 2, textAlign: 'right' },
  notificationBody: { color: '#4E4853', fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: 'right' },
  notificationTime: { color: MUTED, fontSize: 9, marginTop: 5 },
  bottomIconWrap: { position: 'relative', minWidth: 30, alignItems: 'center' },
  bottomBadge: { position: 'absolute', top: -8, right: -12, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: '#DC2626', paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  bottomBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },

'''
if styles not in s:
    if style_marker not in s:
        raise SystemExit('bottomBar style marker not found')
    s = s.replace(style_marker, styles + style_marker, 1)

p.write_text(s)
