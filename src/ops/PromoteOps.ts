import { frodo, FrodoError, state } from '@rockcarver/frodo-lib'
import { FullExportInterface, FullExportOptions } from '@rockcarver/frodo-lib/types/ops/ConfigOps';
import { printError, verboseMessage } from '../utils/Console';
import {
  getFullExportConfigFromDirectory,
} from '../utils/Config';
const { saveJsonToFile, saveTextToFile, getFilePath, getWorkingDirectory } = frodo.utils;
const { exportFullConfiguration } = frodo.config;
import { exportItem } from "./ConfigOps"
import { importFirstThemeFromFile } from "./ThemeOps"
import { importFirstServiceFromFile } from './ServiceOps.js';
import { importJourneyFromFile } from './JourneyOps';
import { importScriptsFromFile } from './ScriptOps';
import { importApplicationsFromFile } from './ApplicationOps';
import { importAuthenticationSettingsFromFile } from './AuthenticationSettingsOps';
import { importPolicySetsFromFile } from './PolicySetOps';
import { importResourceTypesFromFile } from './ResourceTypeOps';

import deepDiff from 'deep-diff';
import * as fs from "fs"
import { promises } from "fs"
import * as path from "path"
import * as crypto from "crypto"

const exportDir = getWorkingDirectory(true) + "/frodo-export"

const changed = [];
const deleted = [];
const added = [];
const logmessages = [];

export async function compareExportToDirectory(
  options: FullExportOptions = {
    useStringArrays: true,
    noDecode: false,
    coords: true,
    includeDefault: true,
    includeActiveValues: false,
    target: '',
  },
  dir: string,
): Promise<boolean> {
  try {
     var options = options
  //   var direct = dir
    //export the full configuration

    // console.log("exporting")
    // emptyDirectory(exportDir)
    
    // if(!await exportEverythingToFiles(options)){
    //   throw new FrodoError("Errors occured while exporting files")
    // }
    // let fileName = 'all.config.json';
    // verboseMessage("importing export")
    // const exportData = await getFullExportConfigFromDirectory(exportDir);
    // saveJsonToFile(exportData, getFilePath(fileName, true));

    // //import everything from separate files in a directory
    // // Todo: state.getDirectory changed over to a parameter passed in 
    // verboseMessage("importing local dir")
    // const data = await getFullExportConfigFromDirectory(dir);
    // let filename2 = 'all2.config.json';
    // saveJsonToFile(data, getFilePath(filename2, true))
    // verboseMessage("Json diffing")
    // const diff = deepDiff.diff(data, exportData)
    // let jsonDiffname = 'jsonDiff.config.json';
    // if (diff) {
    //   verboseMessage("savingDiff")
    //   saveTextToFile(JSON.stringify(diff), getFilePath(jsonDiffname, true))
    // }

    verboseMessage("fileDiffing")
    let fileDiffname = 'fileDiff.config.json';
    compareDirectories(exportDir, dir)
    let compareObj: CompareObj = {added, changed, deleted}
    saveJsonToFile(compareObj, getFilePath(fileDiffname, true))
    saveJsonToFile(logmessages, getFilePath("a" + fileDiffname, true))
    
    return true;
  } catch (error) {
    printError(error);
    verboseMessage("Hello there we have an error!!!!!!!!!!!")
  }
  return false;
}

/**
 * Export everything to separate files
 * @param {boolean} extract Extracts the scripts from the exports into separate files if true
 * @param {boolean} separateMappings separate sync.json mappings if true, otherwise keep them in a single file
 * @param {boolean} includeMeta true to include metadata, false otherwise. Default: true
 * @param {FullExportOptions} options export options
 * @return {Promise<boolean>} a promise that resolves to true if successful, false otherwise
 */
export async function exportEverythingToFiles(
  options: FullExportOptions = {
    useStringArrays: true,
    noDecode: false,
    coords: true,
    includeDefault: false,
    includeActiveValues: false,
    target: '',
  },
  extract: boolean = true,
  separateMappings: boolean = false,
  includeMeta: boolean = false,
): Promise<boolean> {
  try {
    const collectErrors: Error[] = [];
    const exportData: FullExportInterface = await exportFullConfiguration(
      options,
      collectErrors
    );
    delete exportData.meta;
    const baseDirectory = exportDir;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.entries(exportData.global).forEach(([type, obj]: [string, any]) =>
      exportItem(
        exportData.global,
        type,
        obj,
        `${baseDirectory}/global`,
        includeMeta,
        extract,
        separateMappings
      )
    );
    Object.entries(exportData.realm).forEach(([realm, data]: [string, any]) =>
      Object.entries(data).forEach(([type, obj]: [string, any]) =>
        exportItem(
          data,
          type,
          obj,
          `${baseDirectory}/realm/${realm}`,
          includeMeta,
          extract,
          separateMappings
        )
      )
    );
    if (collectErrors.length > 0) {
      throw new FrodoError(`Errors occurred during full export`, collectErrors);
    }
    return true;
  } catch (error) {
    printError(error);
  }
  return false;
}

// Function to hash a file using SHA-256
function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const fileData = fs.readFileSync(filePath);
  hash.update(fileData);
  return hash.digest('hex');
}

// Function to compare two directories
function compareDirectories(dir1, dir2) {
  // Walk through dir1
  const walkDir = (dir, callback) => {
      fs.readdirSync(dir).forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
              walkDir(filePath, callback);
          } else {
              callback(filePath);
          }
      });
  };

  // First directory traversal
  walkDir(dir1, (file: string) => {
      const relativePath = path.relative(dir1, file);
      const counterpart = path.join(dir2, relativePath);

      if (relativePath.startsWith('.git' + path.sep) || relativePath.includes("README.md")) {
          return; // Skip .git directories
      }

      if (fs.existsSync(counterpart)) {
          const hash1 = hashFile(file);
          const hash2 = hashFile(counterpart);
          if (hash1 !== hash2) {
              changed.push(`'${relativePath}'`);
              changeFile(relativePath, dir2)
          }
      } else {
          deleted.push(`'${relativePath}'`);
          deleteFile(relativePath)
      }
  });

  // Second directory traversal to find added files
  walkDir(dir2, (file: string) => {
      const relativePath = path.relative(dir2, file);
      const counterpart = path.join(dir1, relativePath);

      if (relativePath.startsWith('.git' + path.sep) || relativePath.includes("README.md")) {
          return; // Skip .git directories
      }

      if (!fs.existsSync(counterpart)) {
          added.push(`'${relativePath}'`);
          addFile(relativePath, dir2)
      }
  });
}

async function emptyDirectory(dirPath: string): Promise<void> {
  const absoluteDirPath = path.resolve(dirPath)
  try {
    // Check if the directory exists
    await promises.access(absoluteDirPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Directory does not exist:', absoluteDirPath);
      return;
    } else {
      throw err; // Some other error, rethrow it
    }
  }
  const files = await promises.readdir(absoluteDirPath);
  verboseMessage("cleaning: ")
  verboseMessage(files)

  for (const file of files) {
    const filePath = path.join(absoluteDirPath, file);
    const stats = await promises.lstat(filePath);

    if (stats.isDirectory()) {
      // Recursively empty the directory
      await emptyDirectory(filePath);
      // Remove the directory itself
      await promises.rmdir(filePath);
    } else {
      // Remove the file
      await promises.unlink(filePath);
    }
  }
}

async function changeFile(path: string, dir: string) {
  logmessages.push("file changed:")
  console.log("File Changed: ")
  await addFile(path, dir)
}

async function addFile(path: string, dir: string) {
  let type: string = path.substring(path.substring(0, path.lastIndexOf('/')).lastIndexOf('/') + 1, path.lastIndexOf('/'))
  let importFilePath = dir + '/' + path;
  let global = (path.substring(0, path.indexOf('/')) === 'global')
  let inRealm = (path.substring(0, path.indexOf('/')) === 'realm')
  let realm: string = null
  if(inRealm) {
    realm = path.substring(path.indexOf('/') + 1, path.indexOf('/', path.indexOf('/') + 1))
    console.log(`realm = ${realm}`)
    state.setRealm(realm)
  }
  
  switch (type) {
    case 'application': {
      // const outcome = await importApplicationsFromFile(importFilePath, {
      //   deps: true,
      // });
      logmessages.push(`add application ${importFilePath}`)
      console.log(`add application ${importFilePath}\n`)
      //logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'authentication': {
      // const outcome = await importAuthenticationSettingsFromFile(importFilePath);
      logmessages.push(`add authentication ${importFilePath}`)
      console.log(`add authentication ${importFilePath}\n`)
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'journey': {
      const data = fs.readFileSync(importFilePath, 'utf8');
      const importData = JSON.parse(data);
      let script = importData["trees"]
      let journeyId = Object.keys(script)[0]
      verboseMessage(`journey Id: ${journeyId}`)
      // const outcome = await importJourneyFromFile(
      //   journeyId,
      //   importFilePath,
      //   {
      //     reUuid: false,
      //     deps: true,
      //   }
      // );
      logmessages.push(`add journey ${importFilePath}`)
      console.log(`add journey ${importFilePath}\n`)
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'managedApplication': {
      logmessages.push(`add managedApplication ${importFilePath}`)
      console.log(`add managedApplication ${importFilePath}\n`)
      logmessages.push(" ")
      break;
    }
    case 'policyset': {
      // const outcome = await importPolicySetsFromFile(importFilePath, {
      //   deps: true,
      //   prereqs: true,
      // });
      logmessages.push(`add policyset ${importFilePath}`)
      console.log(`add policyset ${importFilePath}\n`)
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'resourcetype': {
      //const outcome = await importResourceTypesFromFile(importFilePath);
      logmessages.push(`add resourcetype ${importFilePath}`)
      console.log(`add resourcetype ${importFilePath}\n`)
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'script': {
      //read out json file to pull the script.uuid.name and ._id 
      const data = fs.readFileSync(importFilePath, 'utf8');
      const importData = JSON.parse(data);
      let scriptKey = Object.keys(importData)[0]
      let script = importData[scriptKey]
      let uuid = Object.keys(script)[0]
      let nestedScript = script[uuid]
      verboseMessage(`script name: ${nestedScript.name}`)
      verboseMessage(`script id: ${nestedScript._id}`)
      // const outcome = await importScriptsFromFile(
      //   nestedScript._id,
      //   nestedScript.name,
      //   importFilePath,
      //   {
      //     deps: true,
      //     reUuid: false,
      //     includeDefault: false,
      //   }
      // );
      logmessages.push(`add script ${importFilePath}`)
      console.log(`add script ${importFilePath}\n`)
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'service': {
      // const outcome = await importFirstServiceFromFile(importFilePath, {
      //   clean: true,
      //   global: global,
      //   realm: inRealm,
      // });
      // if (!outcome) process.exitCode = 1;
      logmessages.push(`add service ${importFilePath}`)
      console.log(`add service ${importFilePath}\n`)
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'theme': {
      //await importFirstThemeFromFile(importFileimportFilePath)
      logmessages.push(`add theme ${importFilePath}`)
      console.log(`add theme ${importFilePath}\n`)
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(" ")
      break;
    }
    case 'emailTemplate': {
      logmessages.push(`add emailTemplate ${importFilePath}`)
      console.log(`add emailTemplate ${importFilePath}\n`)
      logmessages.push(" ")
      break;
    }
    case 'idm': {
      logmessages.push(`add idm ${importFilePath}`)
      console.log(`add idm ${importFilePath}\n`)
      logmessages.push(" ")
      break;
    }
    case 'secret': {
      logmessages.push(`add secret ${importFilePath}`)
      console.log(`add secret ${importFilePath}\n`)
      logmessages.push(" ")
      break;
    }
    case 'sync': {
      logmessages.push(`add sync ${importFilePath}`)
      console.log(`add sync ${importFilePath}\n`)
      logmessages.push(" ")
      break;
    }
    case 'variable': {
      logmessages.push(`add variable ${importFilePath}`)
      console.log(`add variable ${importFilePath}\n`)
      logmessages.push(" ")
      break;
    }
    default: {
      logmessages.push(`add ${importFilePath}`)
      console.log(`add ${importFilePath}\n`)
      logmessages.push(" ")
      break;
    }
  }
}

async function deleteFile(path: string, change: boolean = false) {
  console.log("File Deleted: ")
  let type: string = path.substring(path.substring(0, path.lastIndexOf('/')).lastIndexOf('/') + 1, path.lastIndexOf('/'))

  switch (type) {
    case 'application': {
      logmessages.push(`delete application ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete application ${path}\n`)
      } else {
        console.log(`delete application ${path}`)
      }
      break;
    }
    case 'authentication': {
      logmessages.push(`delete authentication ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete authentication ${path}\n`)
      } else {
        console.log(`delete authentication ${path}`)
      }
      break;
    }
    case 'journey': {
      logmessages.push(`delete journey ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete journey ${path}\n`)
      } else {
        console.log(`delete journey ${path}`)
      }
      break;
    }
    case 'managedApplication': {
      logmessages.push(`delete managedApplication ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete managedApplication ${path}\n`)
      } else {
        console.log(`delete managedApplication ${path}`)
      }
      break;
    }
    case 'policyset': {
      logmessages.push(`delete policyset ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete policyset ${path}\n`)
      } else {
        console.log(`delete policyset ${path}`)
      }
      break;
    }
    case 'resourcetype': {
      logmessages.push(`delete resourcetype ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete resourcetype ${path}\n`)
      } else {
        console.log(`delete resourcetype ${path}`)
      }
      break;
    }
    case 'script': {
      logmessages.push(`delete script ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete script ${path}\n`)
      } else {
        console.log(`delete script ${path}`)
      }
      break;
    }
    case 'service': {
      logmessages.push(`delete service ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete service ${path}\n`)
      } else {
        console.log(`delete service ${path}`)
      }
      break;
    }
    case 'theme': {
      logmessages.push(`delete theme ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete theme ${path}\n`)
      } else {
        console.log(`delete theme ${path}`)
      }
      break;
    }
    case 'emailTemplate': {
      logmessages.push(`delete emailTemplate ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete emailTemplate ${path}\n`)
      } else {
        console.log(`delete emailTemplate ${path}`)
      }
      break;
    }
    case 'idm': {
      logmessages.push(`delete idm ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete idm ${path}\n`)
      } else {
        console.log(`delete idm ${path}`)
      }
      break;
    }
    case 'secret': {
      logmessages.push(`delete secret ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete secret ${path}\n`)
      } else {
        console.log(`delete secret ${path}`)
      }
      break;
    }
    case 'sync': {
      logmessages.push(`delete sync ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete sync ${path}\n`)
      } else {
        console.log(`delete sync ${path}`)
      }
      break;
    }
    case 'variable': {
      logmessages.push(`delete variable ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete variable ${path}\n`)
      } else {
        console.log(`delete variable ${path}`)
      }
      break;
    }
    default: {
      logmessages.push(`delete ${path}`)
      if(!change){
        logmessages.push(" ")
        console.log(`delete ${path}\n`)
      } else {
        console.log(`delete ${path}`)
      }
      break;
    }
  }
}

interface CompareObj{ 
  added: string[],
  changed: string[],
  deleted: string[] 
}