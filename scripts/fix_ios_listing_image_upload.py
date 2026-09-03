from pathlib import Path
import json

app_path = Path('mobile/App.tsx')
text = app_path.read_text()

anchor = "import * as ImagePicker from 'expo-image-picker';\n"
imp = "import * as ImageManipulator from 'expo-image-manipulator';\n"
if imp not in text:
    if anchor not in text:
        raise SystemExit('ImagePicker import not found')
    text = text.replace(anchor, anchor + imp, 1)

helper_anchor = "async function uploadListingVideo(listingId: number, asset: ImagePicker.ImagePickerAsset, token: string) {"
helper = '''async function normalizeListingImage(asset: ImagePicker.ImagePickerAsset): Promise<{ uri: string; mimeType: string }> {
  // iPhone Photos can return HEIC/HEIF. Laravel validates the actual bytes,
  // so changing only the multipart MIME is not enough. Re-encode every image to JPEG.
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, mimeType: 'image/jpeg' };
}

'''
if 'async function normalizeListingImage(' not in text:
    if helper_anchor not in text:
        raise SystemExit('uploadListingVideo anchor not found')
    text = text.replace(helper_anchor, helper + helper_anchor, 1)

old_create = '''      for (const asset of images) {
        const upload = await FileSystem.uploadAsync(`${API_URL}/listings/${listing.id}/images`, asset.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'images[]',
          mimeType: asset.mimeType || 'image/jpeg',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });'''
new_create = '''      for (const asset of images) {
        const normalized = await normalizeListingImage(asset);
        const upload = await FileSystem.uploadAsync(`${API_URL}/listings/${listing.id}/images`, normalized.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'images[]',
          mimeType: normalized.mimeType,
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });'''

old_edit = '''      for (const asset of newImages) {
        const upload = await FileSystem.uploadAsync(`${API_URL}/listings/${listing.id}/images`, asset.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'images[]',
          mimeType: asset.mimeType || 'image/jpeg',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });'''
new_edit = '''      for (const asset of newImages) {
        const normalized = await normalizeListingImage(asset);
        const upload = await FileSystem.uploadAsync(`${API_URL}/listings/${listing.id}/images`, normalized.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'images[]',
          mimeType: normalized.mimeType,
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });'''

if old_create not in text:
    raise SystemExit('Create upload block not found')
if old_edit not in text:
    raise SystemExit('Edit upload block not found')
text = text.replace(old_create, new_create, 1)
text = text.replace(old_edit, new_edit, 1)
app_path.write_text(text)

pkg_path = Path('mobile/package.json')
pkg = json.loads(pkg_path.read_text())
pkg.setdefault('dependencies', {})['expo-image-manipulator'] = '~57.0.4'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

app_json = Path('mobile/app.json')
conf = json.loads(app_json.read_text())
conf['expo']['version'] = '1.0.3'
app_json.write_text(json.dumps(conf, ensure_ascii=False, indent=2) + '\n')
