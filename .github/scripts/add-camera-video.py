from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'MISSING:{label}')
    s = s.replace(old, new, 1)

rep("  Image,\n  Pressable,", "  Image,\n  Linking,\n  Pressable,", 'Linking import')
rep("  status?: 'draft' | 'published' | 'sold' | 'archived';\n};", "  status?: 'draft' | 'published' | 'sold' | 'archived';\n  video_path?: string | null;\n};", 'Listing video_path')

needle = """function imageUrl(image?: ListingImage) {
  const raw = image?.url || image?.path;
  if (!raw) return undefined;
  if (/^https?:\\/\\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${SITE_URL}${raw}`;
  if (raw.startsWith('storage/')) return `${SITE_URL}/${raw}`;
  return `${SITE_URL}/storage/${raw}`;
}
"""
insert = needle + """
function videoUrl(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\\/\\//i.test(path)) return path;
  if (path.startsWith('/')) return `${SITE_URL}${path}`;
  if (path.startsWith('storage/')) return `${SITE_URL}/${path}`;
  return `${SITE_URL}/storage/${path}`;
}

function validateVideoAsset(asset: ImagePicker.ImagePickerAsset) {
  const maxBytes = 100 * 1024 * 1024;
  if (asset.fileSize && asset.fileSize > maxBytes) {
    throw new Error('حجم الفيديو أكبر من 100MB. اختر فيديو أقصر أو أقل حجمًا.');
  }
  return asset;
}

async function capturePhotoAsset() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('اسمح للتطبيق باستخدام الكاميرا لالتقاط الصور.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, cameraType: ImagePicker.CameraType.back });
  return result.canceled ? null : result.assets[0];
}

async function pickVideoAsset(source: 'library' | 'camera') {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('اسمح للتطبيق باستخدام الكاميرا لتصوير الفيديو.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60, cameraType: ImagePicker.CameraType.back });
    return result.canceled ? null : validateVideoAsset(result.assets[0]);
  }
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('اسمح للتطبيق بالوصول إلى الصور والفيديو.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false });
  return result.canceled ? null : validateVideoAsset(result.assets[0]);
}

async function uploadListingVideo(listingId: number, asset: ImagePicker.ImagePickerAsset, token: string) {
  const upload = await FileSystem.uploadAsync(`${API_URL}/listings/${listingId}/video`, asset.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'video',
    mimeType: asset.mimeType || 'video/mp4',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (upload.status < 200 || upload.status >= 300) {
    let message = `تعذر رفع الفيديو (${upload.status})`;
    try {
      const body = JSON.parse(upload.body || '{}');
      const errors = body?.errors ? Object.values(body.errors).flat().join('، ') : '';
      message = errors || body?.message || message;
    } catch {}
    throw new Error(message);
  }
}
"""
rep(needle, insert, 'media helpers')

rep("""        <Pressable
          style={styles.favoriteBubble}
          onPress={(event) => {
            event.stopPropagation?.();
            onFavorite();
          }}
        >
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={21} color={favorite ? PURPLE : '#5E5965'} />
        </Pressable>
""", """        <Pressable
          style={styles.favoriteBubble}
          onPress={(event) => {
            event.stopPropagation?.();
            onFavorite();
          }}
        >
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={21} color={favorite ? PURPLE : '#5E5965'} />
        </Pressable>
        {item.video_path ? <View style={styles.videoBadge}><Ionicons name=\"videocam\" size={13} color=\"#fff\" /><Text style={styles.videoBadgeText}>فيديو</Text></View> : null}
""", 'card video badge')

rep("""  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coords, setCoords] = useState<Coordinates | null>(null);
""", """  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [coords, setCoords] = useState<Coordinates | null>(null);
""", 'create video state')

old_choose = """  const chooseImages = async () => {
    const remaining = 8 - images.length;
    if (remaining <= 0) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('الصور', 'يرجى السماح بالوصول إلى الصور.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    setImages((current) => {
      const next = [...current];
      for (const asset of result.assets) {
        if (!next.some((x) => (x.assetId || x.uri) === (asset.assetId || asset.uri))) next.push(asset);
      }
      return next.slice(0, 8);
    });
  };
"""
new_choose = old_choose + """

  const takePhoto = async () => {
    if (images.length >= 8) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    try {
      const asset = await capturePhotoAsset();
      if (asset) setImages((current) => [...current, asset].slice(0, 8));
    } catch (e) { Alert.alert('الكاميرا', e instanceof Error ? e.message : 'تعذر فتح الكاميرا.'); }
  };

  const chooseVideo = async () => {
    try { const asset = await pickVideoAsset('library'); if (asset) setVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر اختيار الفيديو.'); }
  };

  const recordVideo = async () => {
    try { const asset = await pickVideoAsset('camera'); if (asset) setVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر تصوير الفيديو.'); }
  };
"""
rep(old_choose, new_choose, 'create media functions')

rep("""      Alert.alert('تم بنجاح', `تم نشر الإعلان ورفع ${images.length} صورة.`);
      onPublished();
""", """      if (video) await uploadListingVideo(listing.id, video, token);
      Alert.alert('تم بنجاح', `تم نشر الإعلان ورفع ${images.length} صورة${video ? ' وفيديو واحد' : ''}.`);
      onPublished();
""", 'create upload video')

rep("""        <Pressable style={styles.uploadButton} onPress={chooseImages}>
          <Ionicons name=\"images-outline\" size={22} color={PURPLE} />
          <Text style={styles.uploadButtonText}>اختيار الصور</Text>
        </Pressable>
""", """        <View style={styles.mediaActionRow}>
          <Pressable style={styles.mediaActionButton} onPress={chooseImages}><Ionicons name=\"images-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>من الألبوم</Text></Pressable>
          <Pressable style={styles.mediaActionButton} onPress={takePhoto}><Ionicons name=\"camera-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير مباشر</Text></Pressable>
        </View>
""", 'create image buttons')

rep("""        </ScrollView>
      </View>

      <Text style={styles.formLabel}>التصنيف</Text>
""", """        </ScrollView>
        <View style={styles.videoSection}>
          <View style={styles.formCardTitleRow}><Text style={styles.formCardTitle}>فيديو الإعلان</Text><Text style={styles.optionalLabel}>اختياري • فيديو واحد</Text></View>
          {video ? (
            <View style={styles.videoSelectedCard}>
              <Pressable style={styles.videoRemove} onPress={() => setVideo(null)}><Ionicons name=\"close\" size={18} color=\"#fff\" /></Pressable>
              <View style={styles.videoInfo}><Text numberOfLines={1} style={styles.videoTitle}>{video.fileName || 'فيديو الإعلان'}</Text><Text style={styles.videoMeta}>{video.duration ? `${Math.max(1, Math.round(video.duration / 1000))} ثانية` : 'فيديو جاهز للرفع'}</Text></View>
              <Ionicons name=\"videocam\" size={28} color={PURPLE} />
            </View>
          ) : (
            <View style={styles.mediaActionRow}>
              <Pressable style={styles.mediaActionButton} onPress={chooseVideo}><Ionicons name=\"film-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>اختيار فيديو</Text></Pressable>
              <Pressable style={styles.mediaActionButton} onPress={recordVideo}><Ionicons name=\"videocam-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير فيديو</Text></Pressable>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.formLabel}>التصنيف</Text>
""", 'create video UI')

rep("""  const [existingImages, setExistingImages] = useState<ListingImage[]>(listing.images || []);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
""", """  const [existingImages, setExistingImages] = useState<ListingImage[]>(listing.images || []);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [existingVideoPath, setExistingVideoPath] = useState<string | null>(listing.video_path || null);
  const [newVideo, setNewVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
""", 'edit video state')

old_edit_choose = """  const chooseImages = async () => {
    const remaining = 8 - existingImages.length - newImages.length;
    if (remaining <= 0) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('الصور', 'يرجى السماح بالوصول إلى الصور.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8,
    });
    if (result.canceled) return;
    setNewImages((current) => [...current, ...result.assets].slice(0, remaining + current.length));
  };
"""
new_edit_choose = old_edit_choose + """

  const takePhoto = async () => {
    if (existingImages.length + newImages.length >= 8) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    try { const asset = await capturePhotoAsset(); if (asset) setNewImages((current) => [...current, asset]); }
    catch (e) { Alert.alert('الكاميرا', e instanceof Error ? e.message : 'تعذر فتح الكاميرا.'); }
  };

  const chooseVideo = async () => {
    try { const asset = await pickVideoAsset('library'); if (asset) setNewVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر اختيار الفيديو.'); }
  };

  const recordVideo = async () => {
    try { const asset = await pickVideoAsset('camera'); if (asset) setNewVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر تصوير الفيديو.'); }
  };

  const deleteExistingVideo = () => {
    Alert.alert('حذف الفيديو', 'هل تريد حذف الفيديو الحالي من الإعلان؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try { await request(`/listings/${listing.id}/video`, { method: 'DELETE' }, token); setExistingVideoPath(null); }
        catch (e) { Alert.alert('تعذر حذف الفيديو', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.'); }
      } },
    ]);
  };
"""
rep(old_edit_choose, new_edit_choose, 'edit media functions')

rep("""      Alert.alert('تم الحفظ', 'تم تعديل الإعلان بنجاح.');
      onSaved();
""", """      if (newVideo) await uploadListingVideo(listing.id, newVideo, token);
      Alert.alert('تم الحفظ', 'تم تعديل الإعلان بنجاح.');
      onSaved();
""", 'edit upload video')

rep("""        <Pressable style={styles.uploadButton} onPress={chooseImages}>
          <Ionicons name=\"images-outline\" size={22} color={PURPLE} />
          <Text style={styles.uploadButtonText}>إضافة صور</Text>
        </Pressable>
""", """        <View style={styles.mediaActionRow}>
          <Pressable style={styles.mediaActionButton} onPress={chooseImages}><Ionicons name=\"images-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>إضافة صور</Text></Pressable>
          <Pressable style={styles.mediaActionButton} onPress={takePhoto}><Ionicons name=\"camera-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير مباشر</Text></Pressable>
        </View>
""", 'edit image buttons')

# Replace second occurrence of image block ending, after edit previews. The first was already changed above.
old = """        </ScrollView>
      </View>

      <Text style={styles.formLabel}>التصنيف</Text>
"""
new = """        </ScrollView>
        <View style={styles.videoSection}>
          <View style={styles.formCardTitleRow}><Text style={styles.formCardTitle}>فيديو الإعلان</Text><Text style={styles.optionalLabel}>اختياري • فيديو واحد</Text></View>
          {newVideo ? (
            <View style={styles.videoSelectedCard}><Pressable style={styles.videoRemove} onPress={() => setNewVideo(null)}><Ionicons name=\"close\" size={18} color=\"#fff\" /></Pressable><View style={styles.videoInfo}><Text numberOfLines={1} style={styles.videoTitle}>{newVideo.fileName || 'فيديو جديد'}</Text><Text style={styles.videoMeta}>سيستبدل الفيديو الحالي عند الحفظ</Text></View><Ionicons name=\"videocam\" size={28} color={PURPLE} /></View>
          ) : existingVideoPath ? (
            <View style={styles.videoSelectedCard}><Pressable style={[styles.videoRemove, { backgroundColor: '#DC2626' }]} onPress={deleteExistingVideo}><Ionicons name=\"trash-outline\" size={17} color=\"#fff\" /></Pressable><View style={styles.videoInfo}><Text style={styles.videoTitle}>فيديو حالي محفوظ</Text><Text style={styles.videoMeta}>يمكن حذفه أو استبداله</Text></View><Ionicons name=\"videocam\" size={28} color={PURPLE} /></View>
          ) : (
            <View style={styles.mediaActionRow}><Pressable style={styles.mediaActionButton} onPress={chooseVideo}><Ionicons name=\"film-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>اختيار فيديو</Text></Pressable><Pressable style={styles.mediaActionButton} onPress={recordVideo}><Ionicons name=\"videocam-outline\" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير فيديو</Text></Pressable></View>
          )}
        </View>
      </View>

      <Text style={styles.formLabel}>التصنيف</Text>
"""
if old not in s:
    raise SystemExit('MISSING:edit video UI anchor')
s = s.replace(old, new, 1)

rep("""          {photos.length > 1 ? <Text style={styles.photoCount}>{photos.length} صور • اسحب للتنقل</Text> : null}
          <View style={styles.detailBody}>
""", """          {photos.length > 1 ? <Text style={styles.photoCount}>{photos.length} صور • اسحب للتنقل</Text> : null}
          {detail.video_path ? (
            <Pressable style={styles.detailVideoButton} onPress={() => { const url = videoUrl(detail.video_path); if (url) Linking.openURL(url).catch(() => Alert.alert('الفيديو', 'تعذر تشغيل الفيديو.')); }}>
              <Ionicons name=\"play-circle\" size={25} color=\"#fff\" />
              <Text style={styles.detailVideoText}>تشغيل فيديو الإعلان</Text>
            </Pressable>
          ) : null}
          <View style={styles.detailBody}>
""", 'detail video button')

rep("""const styles = StyleSheet.create({
  ownerManageSection:""", """const styles = StyleSheet.create({
  mediaActionRow: { flexDirection: 'row-reverse', gap: 9, marginTop: 9 },
  mediaActionButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: '#D8C9F1', backgroundColor: '#FAF7FF', flexDirection: 'row-reverse', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  mediaActionText: { color: PURPLE, fontWeight: '900', fontSize: 12 },
  videoSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#EEE7F5', paddingTop: 14 },
  optionalLabel: { color: MUTED, fontSize: 10, fontWeight: '700' },
  videoSelectedCard: { minHeight: 70, borderRadius: 14, backgroundColor: PURPLE_LIGHT, borderWidth: 1, borderColor: '#D8C9F1', marginTop: 9, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  videoInfo: { flex: 1, alignItems: 'flex-end' },
  videoTitle: { color: TEXT, fontSize: 13, fontWeight: '900', textAlign: 'right' },
  videoMeta: { color: MUTED, fontSize: 10, marginTop: 3, textAlign: 'right' },
  videoRemove: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#514B57', alignItems: 'center', justifyContent: 'center' },
  videoBadge: { position: 'absolute', left: 9, bottom: 9, borderRadius: 12, backgroundColor: 'rgba(100,38,200,0.92)', paddingHorizontal: 7, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  detailVideoButton: { marginHorizontal: 18, marginTop: 12, minHeight: 52, borderRadius: 15, backgroundColor: PURPLE, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  detailVideoText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ownerManageSection:""", 'media styles')

p.write_text(s)
print('CAMERA_VIDEO_PATCH=OK')
