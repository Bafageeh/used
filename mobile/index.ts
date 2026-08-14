import { registerRootComponent } from 'expo';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import App from './App';

const formDataPrototype = globalThis.FormData?.prototype as any;

if (formDataPrototype && !formDataPrototype.__usedFilePatch) {
  const originalAppend = formDataPrototype.append;

  formDataPrototype.append = function append(name: string, value: any, filename?: string) {
    if (value && typeof value === 'object' && typeof value.uri === 'string') {
      const file = new File(value.uri);
      return originalAppend.call(this, name, file);
    }

    if (filename === undefined) {
      return originalAppend.call(this, name, value);
    }

    return originalAppend.call(this, name, value, filename);
  };

  formDataPrototype.__usedFilePatch = true;
}

(globalThis as any).fetch = expoFetch;

registerRootComponent(App);
