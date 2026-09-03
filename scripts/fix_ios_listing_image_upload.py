from pathlib import Path
import json

app_path = Path('mobile/App.tsx')
text = app_path.read_text()

# Import ImageManipulator for real JPEG conversion (HEIC/HEIF cannot be fixed by changing MIME only).
anchor = "import * as ImagePicker from 'expo-image-picker';\n"
imp = "import * as ImageManipulator from 'expo-image-manipulator';\n"
if imp not in text:
    if anchor not in text:
        raise SystemExit('ImagePicker import not found')
    text = text.replace(anchor, anchor + imp, 1)

helper_anchor = "async function uploadListingVideo(listingId: number, asset: ImagePicker.ImagePickerAsset, token: string) {"
helper = '''async function normalizeListingImage(asset: ImagePicker.ImagePickerAsset): Promise<{ uri: string; mimeType: string }> {
  // iPhone Photos may return HEIC/HEIF even when the multipart MIME is labelled image/jpeg.
  // Laravel validates the actual bytes, so always re-encode selected images to JPEG before upload.
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

# This exact block appears in create and edit. Replace both.
count = text.count(old_create)
if count < 2:
    raise SystemExit(f'Expected 2 upload blocks, found {count}')
text = text.replace(old_create, new_create)

app_path.write_text(text)

pkg_path = Path('mobile/package.json')
pkg = json.loads(pkg_path.read_text())
pkg.setdefault('dependencies', {})['expo-image-manipulator'] = '~57.0.4'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

app_json = Path('mobile/app.json')
conf = json.loads(app_json.read_text())
conf['expo']['version'] = '1.0.3'
app_json.write_text(json.dumps(conf, ensure_ascii=False, indent=2) + '\n')
