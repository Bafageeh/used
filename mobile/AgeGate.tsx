import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const P='#6426C8'; const PD='#4B169E'; const TEXT='#18181B'; const MUTED='#71717A';

export default function AgeGate({ onAllowed, onBack }:{ onAllowed:()=>void; onBack?:()=>void }) {
  const [day,setDay]=useState(''); const [month,setMonth]=useState(''); const [year,setYear]=useState('');
  const submit=async()=>{
    const d=Number(day.replace(/\D/g,'')); const m=Number(month.replace(/\D/g,'')); const y=Number(year.replace(/\D/g,''));
    const now=new Date();
    if(!Number.isInteger(y)||y<1900||y>now.getFullYear()||!Number.isInteger(m)||m<1||m>12||!Number.isInteger(d)||d<1||d>31) return Alert.alert('تاريخ الميلاد','أدخل تاريخ ميلاد صحيحًا.');
    const dob=new Date(y,m-1,d);
    if(dob.getFullYear()!==y||dob.getMonth()!==m-1||dob.getDate()!==d||dob>now) return Alert.alert('تاريخ الميلاد','أدخل تاريخ ميلاد صحيحًا.');
    let age=now.getFullYear()-y;
    const birthdayPassed=(now.getMonth()>m-1)||(now.getMonth()===m-1&&now.getDate()>=d);
    if(!birthdayPassed) age--;
    if(age<18) return Alert.alert('العمر المطلوب','«تنازل» مخصص للمستخدمين بعمر 18 سنة فأكثر.');
    onAllowed();
  };
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={s.root}>
    <View style={s.card}>
      <View style={s.icon}><Ionicons name="shield-checkmark-outline" size={38} color={P}/></View>
      <Text style={s.title}>التحقق من العمر</Text>
      <Text style={s.text}>هذه الخطوة تظهر فقط عند إنشاء حساب جديد. أدخل تاريخ ميلادك للتحقق من أن عمرك 18 سنة أو أكثر، ولا يتم حفظ تاريخ الميلاد.</Text>
      <View style={s.dateRow}>
        <TextInput value={day} onChangeText={setDay} placeholder="يوم" keyboardType="number-pad" maxLength={2} style={s.smallInput} textAlign="center" />
        <TextInput value={month} onChangeText={setMonth} placeholder="شهر" keyboardType="number-pad" maxLength={2} style={s.smallInput} textAlign="center" />
        <TextInput value={year} onChangeText={setYear} placeholder="سنة" keyboardType="number-pad" maxLength={4} style={s.yearInput} textAlign="center" onSubmitEditing={submit}/>
      </View>
      <Pressable style={s.button} onPress={submit}><Text style={s.buttonText}>متابعة التسجيل</Text></Pressable>
      {onBack ? <Pressable style={s.backButton} onPress={onBack}><Text style={s.backText}>العودة لتسجيل الدخول</Text></Pressable> : null}
      <Text style={s.note}>يُستخدم تاريخ الميلاد للتحقق من العمر فقط ولا يتم حفظه.</Text>
    </View>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:PD,alignItems:'center',justifyContent:'center',padding:18},card:{width:'100%',maxWidth:430,backgroundColor:'#fff',borderRadius:24,padding:24,alignItems:'center'},icon:{width:74,height:74,borderRadius:37,backgroundColor:'#F2EBFF',alignItems:'center',justifyContent:'center'},title:{fontSize:23,fontWeight:'900',color:TEXT,marginTop:14},text:{fontSize:13,lineHeight:22,color:MUTED,textAlign:'center',marginTop:8},dateRow:{width:'100%',flexDirection:'row',gap:8,marginTop:20},smallInput:{flex:1,height:56,borderWidth:1.5,borderColor:'#D8D2DF',borderRadius:14,fontSize:17,fontWeight:'900',color:TEXT,backgroundColor:'#FAFAFA'},yearInput:{flex:1.45,height:56,borderWidth:1.5,borderColor:'#D8D2DF',borderRadius:14,fontSize:17,fontWeight:'900',color:TEXT,backgroundColor:'#FAFAFA'},button:{width:'100%',height:54,borderRadius:14,backgroundColor:P,alignItems:'center',justifyContent:'center',marginTop:12},buttonText:{color:'#fff',fontSize:16,fontWeight:'900'},backButton:{paddingVertical:13,paddingHorizontal:18},backText:{color:P,fontSize:13,fontWeight:'900'},note:{fontSize:10,lineHeight:17,color:'#8A8590',textAlign:'center',marginTop:12}});
