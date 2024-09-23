import { frodo, FrodoError, state } from '@rockcarver/frodo-lib'
import { FullExportOptions } from '@rockcarver/frodo-lib/types/ops/ConfigOps';
import { printError } from '../utils/Console';
const { saveJsonToFile, getFilePath } = frodo.utils;
const { exportFullConfiguration } = frodo.config;

export async function compareExportToDirectory(
  exp: string,
  includeMeta = true,
  dir: string,
  options: FullExportOptions = {
    useStringArrays: true,
    noDecode: false,
    coords: true,
    includeDefault: false,
    includeActiveValues: false,
    target: '',
  }
): Promise<boolean> {
  try {
    const collectErrors: Error[] = [];
    const exportData = await exportFullConfiguration(options, collectErrors);
    let fileName = 'all.config.json';
    saveJsonToFile(exportData, getFilePath(fileName, true), includeMeta);
    if (collectErrors.length > 0) {
      throw new FrodoError(`Errors occurred during full export`, collectErrors);
    }
    return true;
  } catch (error) {
    printError(error);
  }
  return false;
}