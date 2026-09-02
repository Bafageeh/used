from pathlib import Path
import json

# Restore the stable entry point. Do not replace global fetch/FormData.
Path('mobile/index.ts').write_text(
    "import { registerRootComponent } from 'expo';\n"
    "import App from './App';\n\n"
    "registerRootComponent(App);\n"
)

pkg_path = Path('mobile/package.json')
pkg = json.loads(pkg_path.read_text())
pkg['main'] = './index.ts'
pkg.setdefault('dependencies', {})['expo-file-system'] = '~57.0.1'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

app = Path('mobile/App.tsx')
text = app.read_text()

anchor = "import * as ImagePicker from 'expo-image-picker';\n"
fs_import = "import * as FileSystem from 'expo-file-system/legacy';\n"
if fs_import not in text:
    if anchor not in text:
        raise SystemExit('ImagePicker import anchor not found')
    text = text.replace(anchor, anchor + fs_import, 1)

# Remove imports from the failed modern File/expoFetch attempt if present.
text = text.replace("import { fetch as expoFetch } from 'expo/fetch';\n", '')
text = text.replace("import { File } from 'expo-file-system';\n", '')

# iOS may return HEIC/HEIF from the photo library. Laravel currently accepts
# jpg/jpeg/png/webp only, so ask PHPicker for the most compatible rendition.
# On iOS this transcodes when needed (typically HEIC -> JPEG); it is ignored
# on other platforms.
compatible_line = "      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,\n"
create_picker = """      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
"""
if create_picker in text and compatible_line not in text[text.find(create_picker):text.find(create_picker) + len(create_picker) + 180]:
    text = text.replace(create_picker, create_picker + compatible_line, 1)

edit_picker = """      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8,
"""
edit_replacement = """      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
"""
if edit_picker in text:
    text = text.replace(edit_picker, edit_replacement, 1)

old_block = """      const form = new FormData();
      images.forEach((asset, index) => {
        form.append('images[]', {
          uri: asset.uri,
          name: asset.fileName || `listing-${listing.id}-${index + 1}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as any);
      });
      await request(`/listings/${listing.id}/images`, { method: 'POST', body: form }, token);"""

new_block = """      for (const asset of images) {
        const upload = await FileSystem.uploadAsync(
          `${API_URL}/listings/${listing.id}/images`,
          asset.uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'images[]',
            mimeType: asset.mimeType || 'image/jpeg',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (upload.status < 200 || upload.status >= 300) {
          let message = `تعذر رفع الصورة (${upload.status})`;
          try {
            const body = JSON.parse(upload.body || '{}');
            const errors = body?.errors
              ? Object.values(body.errors).flat().join('، ')
              : '';
            message = errors || body?.message || message;
          } catch {}
          throw new Error(message);
        }
      }"""

if old_block in text:
    text = text.replace(old_block, new_block, 1)
elif 'FileSystem.uploadAsync(' not in text:
    start = text.find('      const form = new FormData();')
    end = text.find("      Alert.alert('تم بنجاح'", start)
    if start == -1 or end == -1:
        raise SystemExit('Listing image upload block not found')
    text = text[:start] + new_block + '\n' + text[end:]

app.write_text(text)
