import { closeSync, openSync, readFileSync, readJsonSync, writeJsonSync, writeSync } from 'fs-extra';
import { resolvePattern } from './files';

export interface TranslationFile {
  path: string;
  data: any;
  keys: string[];
}

export interface ComparedTranslationFile extends TranslationFile {
  additions: string[];
  substractions: string[];
}

export function saveTranslation(file: TranslationFile) {
  writeJsonSync(file.path, sortTranslation(file.data), { spaces: 2 });
}

function sortTranslation(data: any) {
  return Object.keys(data)
    .sort()
    .reduce((sorted, key) => {
      if (typeof data[key] === 'string') {
        sorted[key] = data[key];
      } else {
        sorted[key] = sortTranslation(data[key]);
      }
      return sorted;
    }, {});
}

export function loadTranslation(path: string): TranslationFile {
  const data = readJsonSync(path);
  const keys = getTranslationKeys(data);
  return {
    path,
    data,
    keys,
  };
}

export function loadTranslations(pattern: string): TranslationFile[] {
  return resolvePattern(pattern).map(path => loadTranslation(path));
}

export function saveComparedTranslation(path: string, files: ComparedTranslationFile[]) {
  const output = openSync(path, 'w');
  files.forEach(file => {
    writeSync(output, `@@@ ${file.path}\n`);
    if (file.additions.length > 0) {
      writeSync(output, file.additions.map(key => `+++ ${key}`).join('\n') + '\n');
    }
    if (file.substractions.length > 0) {
      writeSync(output, file.substractions.map(key => `--- ${key}`).join('\n') + '\n');
    }
  });
  closeSync(output);
}

export function loadComparedTranslations(path: string): ComparedTranslationFile[] {
  const content = readFileSync(path, 'utf8');
  return content
    .split('@@@ ')
    .map(c => c.trim())
    .filter(Boolean)
    .map(data => {
      const lines = data.split('\n');
      const path = lines.shift();
      const file = loadTranslation(path);
      const additions = lines.filter(line => line.startsWith('+++ ')).map(line => line.substr(4));
      const substractions = lines.filter(line => line.startsWith('--- ')).map(line => line.substr(4));
      return {
        ...file,
        additions,
        substractions,
      };
    });
}

export function compareTranslation(reference: TranslationFile, file: TranslationFile): ComparedTranslationFile {
  return {
    ...file,
    additions: file.keys.filter(key => !reference.keys.includes(key)),
    substractions: reference.keys.filter(key => !file.keys.includes(key)),
  };
}

function getTranslationKeys(data: any, prefix: string = '') {
  return Object.keys(data).reduce((keys, key) => {
    if (typeof data[key] === 'string') {
      keys.push(prefix + key);
    } else {
      keys = [...keys, ...getTranslationKeys(data[key], prefix + key + '.')];
    }
    return keys;
  }, []);
}

export function addTranslationKey(data: any, key: string, value: string) {
  if (!data) {
    return false;
  }

  if (!key.includes('.')) {
    if (!data[key]) {
      data[key] = value;
      return true;
    }
    return false;
  }

  const [firstkey, ...otherKeys] = key.split('.');

  if (!data[firstkey]) {
    data[firstkey] = {};
  }

  return addTranslationKey(data[firstkey], otherKeys.join('.'), value);
}

export function deleteTranslationKey(data: any, key: string): boolean {
  if (!data) {
    return false;
  }

  if (!key.includes('.')) {
    if (data[key]) {
      delete data[key];
      return true;
    }
    return false;
  }

  const [firstkey, ...otherKeys] = key.split('.');
  return deleteTranslationKey(data[firstkey], otherKeys.join('.'));
}

export function getTranslationValue(data: any, path: string) {
  return path.split('.').reduce((data, key) => data[key] || null, data);
}
