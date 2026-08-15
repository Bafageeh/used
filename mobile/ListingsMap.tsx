import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

type MapListing = {
  id: number;
  title: string;
  city?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type Props = {
  listings: MapListing[];
  onBack: () => void;
  onOpenListing: (id: number) => void;
};

const PURPLE = '#6426C8';
const PURPLE_DARK = '#4B169E';
const TEXT = '#18181B';
const MUTED = '#71717A';

function htmlFor(points: { id: number; title: string; city: string; latitude: number; longitude: number }[]) {
  const data = JSON.stringify(points).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#f4f1f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
.leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 7px 26px rgba(52,20,87,.18)}
.leaflet-popup-content{margin:12px 13px;min-width:170px;text-align:right}
.title{font-weight:800;font-size:15px;color:#18181b;margin-bottom:5px}.meta{color:#71717a;font-size:12px;margin-bottom:8px}.free{color:#6426C8;font-size:14px;font-weight:800;margin-bottom:9px}
.open{width:100%;border:0;background:#6426C8;color:#fff;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:800;cursor:pointer}
.marker-dot{width:30px;height:30px;border-radius:18px;background:#6426C8;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  const points=${data};
  const map=L.map('map',{zoomControl:true,attributionControl:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  const bounds=[];
  const icon=L.divIcon({className:'',html:'<div class="marker-dot">●</div>',iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-16]});
  points.forEach(function(p){
    const marker=L.marker([p.latitude,p.longitude],{icon:icon}).addTo(map);
    bounds.push([p.latitude,p.longitude]);
    const wrap=document.createElement('div');
    const title=document.createElement('div'); title.className='title'; title.textContent=p.title || 'إعلان'; wrap.appendChild(title);
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent=p.city || 'بدون مدينة'; wrap.appendChild(meta);
    const free=document.createElement('div'); free.className='free'; free.textContent='مجانا'; wrap.appendChild(free);
    const btn=document.createElement('button'); btn.className='open'; btn.textContent='فتح الإعلان'; btn.onclick=function(){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'listing',id:p.id})); }; wrap.appendChild(btn);
    marker.bindPopup(wrap);
  });
  if(bounds.length===1){ map.setView(bounds[0],14); }
  else if(bounds.length>1){ map.fitBounds(bounds,{padding:[36,36],maxZoom:14}); }
  else { map.setView([23.8859,45.0792],5); }
})();
</script>
</body>
</html>`;
}

export default function ListingsMap({ listings, onBack, onOpenListing }: Props) {
  const points = useMemo(() => listings.flatMap((item) => {
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
    return [{ id: item.id, title: item.title || 'إعلان', city: item.city || '', latitude, longitude }];
  }), [listings]);

  const source = useMemo(() => ({ html: htmlFor(points), baseUrl: 'https://used.pm.sa' }), [points]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data || '{}');
      const id = Number(data?.id);
      if (data?.type === 'listing' && Number.isInteger(id) && id > 0) onOpenListing(id);
    } catch {}
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>الخريطة</Text>
          <Text style={styles.subtitle}>{points.length} إعلان بموقع محدد</Text>
        </View>
        <View style={styles.headerButton}><Ionicons name="map-outline" size={23} color="#fff" /></View>
      </View>

      {points.length ? (
        <WebView
          source={source}
          originWhitelist={['*']}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => <View style={styles.loading}><ActivityIndicator size="large" color={PURPLE} /><Text style={styles.loadingText}>جاري تحميل الخريطة...</Text></View>}
          style={styles.webview}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="location-outline" size={48} color={PURPLE} /></View>
          <Text style={styles.emptyTitle}>لا توجد مواقع على الخريطة حاليًا</Text>
          <Text style={styles.emptyText}>تظهر هنا الإعلانات التي أضاف أصحابها موقعًا دقيقًا. يمكنك الرجوع ومشاهدة باقي الإعلانات بشكل طبيعي.</Text>
          <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backButtonText}>العودة للإعلانات</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FA' },
  header: { minHeight: 88, paddingTop: 36, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: PURPLE_DARK, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1, alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  subtitle: { color: '#E8DAFF', fontSize: 11, fontWeight: '700', marginTop: 2 },
  webview: { flex: 1, backgroundColor: '#F8F7FA' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#F8F7FA' },
  loadingText: { color: MUTED, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#F2EBFF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { color: TEXT, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 22, textAlign: 'center', marginTop: 8, maxWidth: 330 },
  backButton: { minHeight: 48, marginTop: 18, borderRadius: 14, backgroundColor: PURPLE, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
