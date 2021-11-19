import { loadTranslations, saveTranslations } from '../translations';
import { Copier } from './copier';

export class CopyCommand {
  constructor(private readonly copier: Copier) {}

  public async run(source: string, target: string, translationsGlob: string) {
    const translations = await loadTranslations(translationsGlob);
    this.copier.copy(source, target, translations);
    await saveTranslations(translations);
  }
}
