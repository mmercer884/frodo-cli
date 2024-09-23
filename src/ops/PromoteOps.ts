import { frodo, FrodoError, state } from '@rockcarver/frodo-lib'
import { FullExportOptions } from '@rockcarver/frodo-lib/types/ops/ConfigOps';
import { printError } from '../utils/Console';
import * as deepDiff from 'deep-diff'
import {
  getFullExportConfigFromDirectory,
} from '../utils/Config';
const { saveJsonToFile, getFilePath } = frodo.utils;
const { exportFullConfiguration } = frodo.config;



export async function compareExportToDirectory(
  file: string,
  //exp: string,
  includeMeta = true,
  //dir: string,
  options: FullExportOptions = {
    useStringArrays: true,
    noDecode: false,
    coords: true,
    includeDefault: false,
    includeActiveValues: false,
    target: '',
  },
  dir: string
): Promise<boolean> {
  try {
    const collectErrors: Error[] = [];
    console.log("comparing")

    //export the full configuration
    const exportData = await exportFullConfiguration(options, collectErrors);
    let fileName = 'all.config.json';
    if (file) {
      fileName = file;
    }
    saveJsonToFile(exportData, getFilePath(fileName, true), includeMeta);
    if (collectErrors.length > 0) {
      throw new FrodoError(`Errors occurred during full export`, collectErrors);
    }

    //import everything from separate files in a directory
    // Todo: state.getDirectory changed over to a parameter passed in 
    const data = await getFullExportConfigFromDirectory(dir);
    let filename2 = 'all2.config.json';
    saveJsonToFile(data, getFilePath(filename2, true), includeMeta)
    const diff = deepDiff.diff(exportData, data)
    console.log("diffing")
    let diffname = 'diff.config.json';
    saveJsonToFile(diff, getFilePath(diffname, true), includeMeta)
    return true;
  } catch (error) {
    printError(error);
  }
  return false;
}