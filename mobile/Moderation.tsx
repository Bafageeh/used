import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';

const API = 'https://used.pm.sa/api';
const P = '#6426C8';
const PL = '#F2EBFF';
const TEXT = '#18181B';
const MUTED = '#71717A';
const BORDER = '#E7E2EF';

type ConversationLite = { buyer_id:number; seller_id:number; buyer?:{id:number;name:string}; seller?:{id:number;name:string} };
type BlockedUser = { id:number; name:string; phone?:string|null; blocked_at?:string };

async function call(path:string, token:string, init:RequestInit={}) {
  const res = await fetch(`${API}${path}`, { ...init, headers:{ Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init.headers||{}) } });
  const text = await res.text(); let data:any={}; try{ data=text?JSON.parse(text):{}; }catch{ data={message:text}; }
  if(!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

function reportOptions(onPick:(reason:string)=>void, title='سبب البلاغ') {
  Alert.alert(title, 'اختر السبب الأقرب للمخالفة:', [
    { text:'احتيال أو تضليل', onPress:()=>onPick('scam') },
    { text:'محتوى محظور أو مسيء', onPress:()=>onPick('prohibited') },
    { text:'إزعاج أو تحرش', onPress:()=>onPick('harassment') },
  ]);
}

async function sendReport(path:string, token:string, reason:string) {
  await call(path, token, { method:'POST', body:JSON.stringify({ reason }) });
  Alert.alert('تم إرسال البلاغ', 'شكرًا لك. تم استلام البلاغ وسيتم مراجعته من الإدارة.');
}

export function ListingSafetyActions({ token, listingId, userId, onBlocked }:{ token:string; listingId:number; userId:number; onBlocked:()=>void }) {
  const block = () => Alert.alert('حظر المستخدم', 'سيتم إخفاء إعلانات هذا المستخدم ومنع الطرفين من بدء أو متابعة المحادثات. هل تريد المتابعة؟', [
    { text:'إلغاء', style:'cancel' },
    { text:'حظر', style:'destructive', onPress:async()=>{ try{ await call(`/blocks/${userId}`,token,{method:'POST'}); Alert.alert('تم الحظر','تم حظر المستخدم.'); onBlocked(); }catch(e){Alert.alert('تعذر الحظر',e instanceof Error?e.message:'حدث خطأ');} } },
  ]);

  return <View style={s.actionGroup}>
    <Text style={s.groupTitle}>السلامة والإبلاغ</Text>
    <View style={s.row}>
      <Pressable style={s.action} onPress={()=>reportOptions(async reason=>{try{await sendReport(`/reports/listings/${listingId}`,token,reason)}catch(e){Alert.alert('تعذر الإبلاغ',e instanceof Error?e.message:'حدث خطأ')}})}><Ionicons name="flag-outline" size={18} color={P}/><Text style={s.actionText}>الإبلاغ عن الإعلان</Text></Pressable>
      <Pressable style={s.action} onPress={()=>reportOptions(async reason=>{try{await sendReport(`/reports/users/${userId}`,token,reason)}catch(e){Alert.alert('تعذر الإبلاغ',e instanceof Error?e.message:'حدث خطأ')}},'الإبلاغ عن المستخدم')}><Ionicons name="person-remove-outline" size={18} color={P}/><Text style={s.actionText}>الإبلاغ عن المستخدم</Text></Pressable>
    </View>
    <Pressable style={s.blockAction} onPress={block}><Ionicons name="ban-outline" size={18} color="#B91C1C"/><Text style={s.blockText}>حظر المستخدم</Text></Pressable>
  </View>;
}

export function ChatSafetyActions({ token, userId, conversation, onBlocked }:{ token:string; userId:number; conversation:ConversationLite; onBlocked:()=>void }) {
  const otherId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
  return <View style={s.chatTools}>
    <Pressable style={s.chatTool} onPress={()=>reportOptions(async reason=>{try{await sendReport(`/reports/users/${otherId}`,token,reason)}catch(e){Alert.alert('تعذر الإبلاغ',e instanceof Error?e.message:'حدث خطأ')}},'الإبلاغ عن المستخدم')}><Ionicons name="flag-outline" size={16} color={P}/><Text style={s.chatToolText}>إبلاغ المستخدم</Text></Pressable>
    <Pressable style={s.chatTool} onPress={()=>Alert.alert('حظر المستخدم','سيتم إيقاف التواصل فورًا وإخفاء محتوى هذا المستخدم.',[{text:'إلغاء',style:'cancel'},{text:'حظر',style:'destructive',onPress:async()=>{try{await call(`/blocks/${otherId}`,token,{method:'POST'});Alert.alert('تم الحظر','تم حظر المستخدم.');onBlocked();}catch(e){Alert.alert('تعذر الحظر',e instanceof Error?e.message:'حدث خطأ')}}}])}><Ionicons name="ban-outline" size={16} color="#B91C1C"/><Text style={[s.chatToolText,{color:'#B91C1C'}]}>حظر</Text></Pressable>
  </View>;
}

export function ReportMessageButton({ token, messageId }:{ token:string; messageId:number }) {
  return <Pressable hitSlop={7} style={s.messageFlag} onPress={()=>reportOptions(async reason=>{try{await sendReport(`/reports/messages/${messageId}`,token,reason)}catch(e){Alert.alert('تعذر الإبلاغ',e instanceof Error?e.message:'حدث خطأ')}},'الإبلاغ عن الرسالة')}>
    <Ionicons name="flag-outline" size={14} color="#8B7D99"/>
    <Text style={s.messageFlagText}>إبلاغ</Text>
  </Pressable>;
}

export function BlockedUsersPanel({ token }:{ token:string }) {
  const [rows,setRows]=useState<BlockedUser[]>([]); const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);try{const d=await call('/blocks',token);setRows(Array.isArray(d)?d:[])}catch(e){Alert.alert('المحظورون',e instanceof Error?e.message:'تعذر التحميل')}finally{setLoading(false)}},[token]);
  useEffect(()=>{void load()},[load]);
  return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.title}>المستخدمون المحظورون</Text><Text style={s.help}>لن تظهر لك إعلانات المستخدم المحظور ولن يتمكن أي منكما من بدء أو متابعة محادثة حتى إلغاء الحظر.</Text>
    {loading?<Text style={s.help}>جاري التحميل...</Text>:rows.length===0?<View style={s.empty}><Ionicons name="shield-checkmark-outline" size={36} color={P}/><Text style={s.emptyTitle}>لا يوجد مستخدمون محظورون</Text></View>:rows.map(u=><View key={u.id} style={s.blockCard}><View style={{flex:1,alignItems:'flex-end'}}><Text style={s.blockName}>{u.name}</Text><Text style={s.blockMeta}>{u.phone||`المستخدم #${u.id}`}</Text></View><Pressable style={s.unblock} onPress={()=>Alert.alert('إلغاء الحظر',`إلغاء حظر ${u.name}؟`,[{text:'إلغاء',style:'cancel'},{text:'إلغاء الحظر',onPress:async()=>{try{await call(`/blocks/${u.id}`,token,{method:'DELETE'});await load()}catch(e){Alert.alert('تعذر إلغاء الحظر',e instanceof Error?e.message:'حدث خطأ')}}}])}><Text style={s.unblockText}>إلغاء الحظر</Text></Pressable></View>)}
  </ScrollView>;
}

const s=StyleSheet.create({
  actionGroup:{width:'100%',marginTop:12,borderWidth:1,borderColor:BORDER,borderRadius:15,padding:12,backgroundColor:'#fff'},groupTitle:{fontSize:13,fontWeight:'900',color:TEXT,textAlign:'right',marginBottom:8},row:{flexDirection:'row-reverse',gap:8},action:{flex:1,minHeight:44,borderRadius:11,backgroundColor:PL,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:6,paddingHorizontal:8},actionText:{color:P,fontSize:11,fontWeight:'900',textAlign:'center'},blockAction:{minHeight:42,marginTop:8,borderRadius:11,borderWidth:1,borderColor:'#FECACA',backgroundColor:'#FFF5F5',alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:6},blockText:{color:'#B91C1C',fontSize:12,fontWeight:'900'},chatTools:{minHeight:42,borderBottomWidth:1,borderBottomColor:BORDER,backgroundColor:'#FAF8FD',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:10,paddingHorizontal:10},chatTool:{flexDirection:'row-reverse',alignItems:'center',gap:5,paddingVertical:7,paddingHorizontal:10},chatToolText:{fontSize:11,color:P,fontWeight:'900'},messageFlag:{flexDirection:'row-reverse',alignItems:'center',gap:3,marginTop:4,alignSelf:'flex-start'},messageFlagText:{fontSize:9,color:'#8B7D99'},page:{padding:16,paddingBottom:40,backgroundColor:'#F8F7FA'},title:{fontSize:21,fontWeight:'900',color:TEXT,textAlign:'right'},help:{fontSize:12,lineHeight:20,color:MUTED,textAlign:'right',marginTop:5,marginBottom:14},empty:{alignItems:'center',padding:28,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:BORDER},emptyTitle:{marginTop:9,fontWeight:'900',color:TEXT},blockCard:{minHeight:68,borderWidth:1,borderColor:BORDER,borderRadius:14,backgroundColor:'#fff',padding:11,marginBottom:9,flexDirection:'row-reverse',alignItems:'center',gap:10},blockName:{fontSize:14,fontWeight:'900',color:TEXT,textAlign:'right'},blockMeta:{fontSize:10,color:MUTED,marginTop:3},unblock:{paddingVertical:9,paddingHorizontal:10,borderRadius:10,backgroundColor:PL},unblockText:{color:P,fontSize:11,fontWeight:'900'},
});
