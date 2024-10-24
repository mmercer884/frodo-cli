import { frodo, FrodoError, state } from '@rockcarver/frodo-lib';
import {
  FullExportInterface,
  FullExportOptions,
} from '@rockcarver/frodo-lib/types/ops/ConfigOps';
import { deleteSaml2Provider } from '@rockcarver/frodo-lib/types/ops/Saml2Ops';
import * as crypto from 'crypto';
import deepDiff from 'deep-diff';
import * as fs from 'fs';

const util = require('util');
import { promises } from 'fs';
import * as path from 'path';

import { getFullExportConfigFromDirectory } from '../utils/Config';
import { printError, verboseMessage } from '../utils/Console';
import { deleteAgent, importAgentFromFile } from './AgentOps';
import {
  deleteApplication,
  importApplicationsFromFile,
} from './ApplicationOps';
import { importAuthenticationSettingsFromFile } from './AuthenticationSettingsOps';
import { deleteSecret, importSecretFromFile } from './cloud/SecretsOps';
import {
  deleteVariableById,
  importVariableFromFile,
} from './cloud/VariablesOps';
import { exportEverythingToFiles, exportItem } from './ConfigOps';
import { importEmailTemplateFromFile } from './EmailTemplateOps';
import { importConfigEntityFromFile } from './IdmOps';
import { importSocialIdentityProviderFromFile } from './IdpOps';
import { deleteJourney, importJourneyFromFile } from './JourneyOps';
import { deleteMapping, importMappingFromFile } from './MappingOps';
import { importOAuth2ClientFromFile } from './OAuth2ClientOps';
import { deletePolicyById, importPolicyFromFile } from './PolicyOps';
import { deletePolicySetById, importPolicySetsFromFile } from './PolicySetOps';
import {
  deleteResourceTypeUsingName,
  importResourceTypesFromFile,
} from './ResourceTypeOps';
import { importSaml2ProviderFromFile } from './Saml2Ops';
import { deleteScriptId, importScriptsFromFile } from './ScriptOps';
import { deleteService, importFirstServiceFromFile } from './ServiceOps.js';
import { deleteTheme, importThemesFromFile } from './ThemeOps';

const {
  saveJsonToFile,
  saveTextToFile,
  getFilePath,
  getWorkingDirectory,
  getRealmUsingExportFormat,
} = frodo.utils;
const { exportFullConfiguration } = frodo.config;

const changed = [];
const deleted = [];
const added = [];
const logmessages = [];

export async function compareExportToDirectory(
  exportDir: string,
  masterDir: string = "../forgeops-export-1/Start",
  options: FullExportOptions = {
    useStringArrays: false,
    noDecode: false,
    coords: true,
    includeDefault: false,
    includeActiveValues: false,
    target: '',
  },
): Promise<boolean> {
  try {
    var options = options;
    options.target = exportDir;
    verboseMessage(`Master dir: ${masterDir}`);
    verboseMessage(`Export dir: ${exportDir}`);
    // var direct = dir
    //export the full configuration

    // try{
    //   verboseMessage("exporting")
    //   await emptyDirectory(dir2)
    //   if(!await exportEverythingToFiles(true, false, false, options, dir2)){
    //     verboseMessage("error in export")
    //     throw new FrodoError("Errors occured while exporting files")
    //   }
    // } catch (e) {
    //   verboseMessage(e)
    // }

    // let fileName = 'all.config.json';
    // verboseMessage("importing export")
    // const exportData = await getFullExportConfigFromDirectory(dir2);
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

    verboseMessage('fileDiffing');
    const fileDiffname = 'fileDiff.config.json';
    await compareDirectoriesAndChange(exportDir, masterDir);
    const compareObj: CompareObj = { added, changed, deleted };
    saveJsonToFile(compareObj, getFilePath('a1' + fileDiffname, true));
    saveJsonToFile(logmessages, getFilePath('a2' + fileDiffname, true));

    // while (added.length > 0) {
    //   added.pop()
    // }
    // while (changed.length > 0) {
    //   changed.pop()
    // }
    // while (deleted.length > 0) {
    //   deleted.pop()
    // }
    
    // try {
    //   await emptyDirectory(exportDir)
    //   if(!await exportEverythingToFiles(true, false, false, options, exportDir)){
    //     throw new FrodoError("Errors occured while exporting files")
    //   }
    // } catch(e) {
    //   verboseMessage(e)
    // }
    

    // verboseMessage("fileDiffing")
    // await compareDirectories(exportDir, masterDir)
    // let compareObj2: CompareObj = {added, changed, deleted}
    // saveJsonToFile(compareObj, getFilePath("b1" + fileDiffname, true))

    return true;
  } catch (error) {
    printError(error);
    verboseMessage('Hello there we have an error!!!!!!!!!!!');
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

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const access = util.promisify(fs.access);

// Function to compare two directories
async function compareDirectoriesAndChange(dir1, dir2) {
  // Walk through dir1 asynchronously
  const walkDir = async (dir, callback): Promise<void> => {
    const files = await readdir(dir);
    await Promise.all(files.map(async (file) => {
      const filePath = path.join(dir, file);
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        await walkDir(filePath, callback);
      } else {
        await callback(filePath);
      }
    }));
  };

  // First directory traversal
  await walkDir(dir1, async (file: string): Promise<void> => {
    const relativePath = path.relative(dir1, file);
    const counterpart = path.join(dir2, relativePath);

    if (
      relativePath.startsWith('.git' + path.sep) ||
      relativePath.includes('README.md')
    ) {
      return; // Skip .git directories and README.md
    }

    try {
      await access(counterpart); // Check if file exists
      const hash1 = await hashFile(file); // Assumes hashFile is async
      const hash2 = await hashFile(counterpart);
      if (hash1 !== hash2) {
        if (!relativePath.includes("theme")) {
          logmessages.push(`change ${relativePath}`);
          changed.push(`'${relativePath}'`);
          await changeFile(relativePath, dir2); // Assumes changeFile is async
          verboseMessage("why do I never hit here");
          logmessages.push(``);
        }
      }
    } catch (err) {
      logmessages.push(`delete ${relativePath}`);
      deleted.push(`'${relativePath}'`);
      await deleteFile(relativePath, dir1); // Assumes deleteFile is async
      verboseMessage("why do I never hit here");
      logmessages.push(` `);
    }
  });

  // Second directory traversal to find added files
  await walkDir(dir2, async (file: string): Promise<void> => {
    const relativePath = path.relative(dir2, file);
    const counterpart = path.join(dir1, relativePath);

    if (
      relativePath.startsWith('.git' + path.sep) ||
      relativePath.includes('README.md')
    ) {
      return; // Skip .git directories and README.md
    }

    try {
      await access(counterpart); // Check if counterpart exists in dir1
    } catch (err) {
      logmessages.push(`add ${relativePath}`);
      added.push(`'${relativePath}'`);
      await addFile(relativePath, dir2); // Assumes addFile is async
      logmessages.push(` `);
    }
  });
}

// Function to compare two directories
async function compareDirectories(dir1, dir2) {
  // Walk through dir1
  const walkDir = async (dir, callback) => {
    fs.readdirSync(dir).forEach(async (file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await walkDir(filePath, callback);
      } else {
        await callback(filePath);
      }
    });
  };

  // First directory traversal
  walkDir(dir1, async (file: string) => {
    const relativePath = path.relative(dir1, file);
    const counterpart = path.join(dir2, relativePath);

    if (
      relativePath.startsWith('.git' + path.sep) ||
      relativePath.includes('README.md')
    ) {
      return; // Skip .git directories
    }

    if (fs.existsSync(counterpart)) {
      const hash1 = hashFile(file);
      const hash2 = hashFile(counterpart);
      if (hash1 !== hash2) {
        changed.push(`'${relativePath}'`);
      }
    } else {
      deleted.push(`'${relativePath}'`);
    }
  });

  // Second directory traversal to find added files
  walkDir(dir2, async (file: string) => {
    const relativePath = path.relative(dir2, file);
    const counterpart = path.join(dir1, relativePath);

    if (
      relativePath.startsWith('.git' + path.sep) ||
      relativePath.includes('README.md')
    ) {
      return; // Skip .git directories
    }

    if (!fs.existsSync(counterpart)) {
      added.push(`'${relativePath}'`);
    }
  });
}

async function emptyDirectory(dirPath: string): Promise<void> {
  const absoluteDirPath = path.resolve(dirPath);
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

async function changeFile(path: string, dir: string): Promise<void> {
  await addFile(path, dir);
}

async function addFile(path: string, dir: string): Promise<void> {
  let type = getTypeFromPath(path);
  const importFilePath = dir + '/' + path;
  const global = path.substring(0, path.indexOf('/')) === 'global';
  const inRealm = path.substring(0, path.indexOf('/')) === 'realm';
  setRealmFromPath(path, inRealm)
  logmessages.push(`realm = ${state.getRealm()}`)

  switch (type) {
    case 'application': {
      const application = getJsonObjectTwoDown(importFilePath);
      verboseMessage(`application id: ${application._id}`);
      // const outcome = await importOAuth2ClientFromFile(
      //   nestedApplication._id,
      //   importFilePath,
      //   {
      //     deps: true,
      //   }
      // );
      logmessages.push(`add application ${importFilePath}`);
      verboseMessage(`add application ${importFilePath}\n`);
      //logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'authentication': {
      // const outcome = await importAuthenticationSettingsFromFile(importFilePath);
      logmessages.push(`add authentication ${importFilePath}`);
      verboseMessage(`add authentication ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'journey': {
      const journey = getJsonObjectOneDown(importFilePath);
      const journeyId = Object.keys(journey)[0];
      verboseMessage(`journey Id: ${journeyId}`);
      logmessages.push(`add journey ${importFilePath}`)
      try{
        const outcome = await importJourneyFromFile(journeyId, importFilePath, {
          reUuid: false,
          deps: true,
        });
        logmessages.push(`outcome: ${outcome}`);
      } catch (e) {
        logmessages.push("error")
        logmessages.push(e)
      }
      logmessages.push(' ');
      break;
    }
    case 'managedApplication': {
      // const outcome = await importApplicationsFromFile(importFilePath, {
      //   deps: true,
      // });
      logmessages.push(`add managedApplication ${importFilePath}`);
      verboseMessage(`add managedApplication ${importFilePath}\n`);
      //logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'policyset': {
      // const outcome = await importPolicySetsFromFile(importFilePath, {
      //   deps: true,
      //   prereqs: true,
      // });
      logmessages.push(`add policyset ${importFilePath}`);
      verboseMessage(`add policyset ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'resourcetype': {
      //const outcome = await importResourceTypesFromFile(importFilePath);
      logmessages.push(`add resourcetype ${importFilePath}`);
      verboseMessage(`add resourcetype ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'script': {
      const script = getJsonObjectTwoDown(importFilePath);
      verboseMessage(`script name: ${script.name}`);
      verboseMessage(`script id: ${script._id}`);
      const outcome = await importScriptsFromFile(
        script._id,
        script.name,
        importFilePath,
        {
          deps: true,
          reUuid: false,
          includeDefault: false,
        }
      );
      logmessages.push(`add script ${importFilePath}`);
      verboseMessage(`add script ${importFilePath}\n`);
      logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'service': {
      // const outcome = await importFirstServiceFromFile(importFilePath, {
      //   clean: true,
      //   global: global,
      //   realm: inRealm,
      // });
      logmessages.push(`add service ${importFilePath}`);
      verboseMessage(`add service ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'theme': {
      // const theme = getJsonObjectTwoDown(importFilePath)
      // logmessages.push(`Theme Id: ${theme._id}`)
      // // const outcome = await importThemesFromFile(importFilePath)
      // logmessages.push(`add theme ${importFilePath}`);
      // verboseMessage(`add theme ${importFilePath}\n`);
      // // logmessages.push(`outcome: ${outcome}`)
      // logmessages.push(' ');
      break;
    }
    case 'emailTemplate': {
      const emailTemplate = getJsonObjectTwoDown(importFilePath);
      verboseMessage(`Email Template Id: ${emailTemplate._id}`);
      const outcome = await importEmailTemplateFromFile(
        emailTemplate._id,
        importFilePath,
        false
      );
      logmessages.push(`add emailTemplate ${importFilePath}`);
      verboseMessage(`add emailTemplate ${importFilePath}\n`);
      logmessages.push(`outcome: ${outcome}`);
      logmessages.push(' ');
      break;
    }
    case 'idm': {
      // if email template the email template add takes care of it so we will not need to do that
      //const outcome = await importConfigEntityFromFile(importFilePath);
      logmessages.push(`add idm ${importFilePath}`);
      verboseMessage(`add idm ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'secret': {
      const secret = getJsonObjectTwoDown(importFilePath);

      verboseMessage(`Importing secret ${secret._id}...`);
      // const outcome = await importSecretFromFile(
      //   nestedSecret._id,
      //   importFilePath,
      //   false,
      //   null
      // );
      logmessages.push(`add secret ${importFilePath}`);
      verboseMessage(`add secret ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'sync': {
      const data = fs.readFileSync(importFilePath, 'utf8');
      const importData = JSON.parse(data);
      verboseMessage(`sync Id: ${importData._id}`);
      // const outcome = await importMappingFromFile(
      //   importData._id,
      //   importFilePath,
      //   {
      //     true,
      //   }
      // );
      logmessages.push(`add sync ${importFilePath}`);
      verboseMessage(`add sync ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'variable': {
      const variable = getJsonObjectOneDown(importFilePath);

      verboseMessage(`Importing variable ${variable._id}...`);
      // const outcome = await importVariableFromFile(
      //   variable._id,
      //   importFilePath
      // );
      logmessages.push(`add variable ${importFilePath}`);
      verboseMessage(`add variable ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'saml': {
      //Todo find the entity ID from the saml file
      // const outcome = await importSaml2ProviderFromFile(
      //   entityId,
      //   importFilePath,
      //   { deps: true }
      // )
      logmessages.push(`add saml ${importFilePath}`);
      verboseMessage(`add saml ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'mapping': {
      const data = fs.readFileSync(importFilePath, 'utf8');
      const importData = JSON.parse(data);
      verboseMessage(`mapping Id: ${importData._id}`);
      // const outcome = await importMappingFromFile(
      //   importData._id,
      //   importFilePath,
      //   {
      //     true,
      //   }
      // );
      logmessages.push(`add mapping ${importFilePath}`);
      verboseMessage(`add mapping ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'agent': {
      const agent = getJsonObjectTwoDown(importFilePath);
      verboseMessage(`Agent id: ${agent._id}`)
      const outcome = await importAgentFromFile(
        agent._id,
        importFilePath
      )
      logmessages.push(`add agents ${importFilePath}`);
      verboseMessage(`add agents ${importFilePath}\n`);
      logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'idp': {
      //need to get idp id somehow
      // verboseMessage(
      //   `Importing provider "${
      //     options.idpId
      //   }" into realm "${state.getRealm()}"...`
      // );
      // const outcome = await importSocialIdentityProviderFromFile(
      //   options.idpId,
      //   importFilePath,
      //   {
      //     deps: true,
      //   }
      // );
      //TODO: think about adding circle of trust ops
      logmessages.push(`add idp ${importFilePath}`);
      verboseMessage(`add idp ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    case 'policy': {
      // const outcome = await importPolicyFromFile(
      //   options.policyId,
      //   importFilePath,
      //   {
      //     deps: true,
      //     prereqs: false
      //   }
      // )
      logmessages.push(`add policy ${importFilePath}`);
      verboseMessage(`add policy ${importFilePath}\n`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      break;
    }
    default: {
      logmessages.push(`missed add for ${importFilePath} with type ${type}`);
      verboseMessage(`missed add for ${importFilePath} with type ${type}\n`);
      logmessages.push(' ');
      break;
    }
  }
}

async function deleteFile(path: string, dir: string): Promise<void> {
  let type = getTypeFromPath(path)
  const deleteFilePath = dir + '/' + path;
  const global = path.substring(0, path.indexOf('/')) === 'global';
  const inRealm = path.substring(0, path.indexOf('/')) === 'realm';
  setRealmFromPath(path, inRealm)

  switch (type) {
    case 'application': {
      // no delete has been written yet
      logmessages.push(`no delete exitsts for application`);
      logmessages.push(`delete application ${deleteFilePath}`);
      //logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`no delete exitsts for application`);
      verboseMessage(`delete application ${deleteFilePath}\n`);
      break;
    }
    case 'authentication': {
      //no delete has been written yet
      logmessages.push(`no delete exitsts for authentication`);
      logmessages.push(`delete authentication ${deleteFilePath}`);
      //logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`no delete exitsts for authentication`);
      verboseMessage(`delete authentication ${deleteFilePath}\n`);
      break;
    }
    case 'journey': {
      const journey = getJsonObjectOneDown(deleteFilePath);
      const journeyId = Object.keys(journey)[0];
      verboseMessage(
        `Deleting journey ${journeyId} in realm "${state.getRealm()}"...`
      );
      const outcome = await deleteJourney(journeyId, {deep: true, verbose: false, progress: false});
      logmessages.push(`delete journey ${deleteFilePath}`);
      logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete journey ${deleteFilePath}\n`);
      break;
    }
    case 'managedApplication': {
      const managedApplication = getJsonObjectTwoDown(deleteFilePath);
      verboseMessage(
        `Deleting Managed Application with id ${managedApplication._id}`
      );
      // const outcome = await deleteApplication(managedApplication._id, true);
      logmessages.push(`delete managedApplication ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete managedApplication ${deleteFilePath}\n`);
      break;
    }
    case 'policyset': {
      const policyset = getJsonObjectOneDown(deleteFilePath);
      verboseMessage(`policy set Id: ${Object.keys(policyset)[0]}`);
      //const outcome = await deletePolicySetById(Object.keys(policyset)[0]);
      logmessages.push(`delete policyset ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete policyset ${deleteFilePath}\n`);
      break;
    }
    case 'resourcetype': {
      const resourcetype = getJsonObjectTwoDown(deleteFilePath);
      verboseMessage(
        `Deleting authorization resource type ${resourcetype.name}`
      );
      // const outcome = await deleteResourceTypeUsingName(resourcetype.name);
      logmessages.push(`delete resourcetype ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete resourcetype ${deleteFilePath}\n`);
      break;
    }
    case 'script': {
      if (
        deleteFilePath.endsWith('.js') ||
        deleteFilePath.endsWith('.groovy')
      ) {
        verboseMessage(deleteFilePath);
        verboseMessage(
          'this is a script file, we will not delete it as a script file,' +
            'but will delete the config and that should delete the script as well\n'
        );
        logmessages.push(deleteFilePath);
        logmessages.push(
          'this is a script file, we will not delete it as a script file,' +
            'but will delete the config and that should delete the script as well\n'
        );
        logmessages.push(' ');
        break;
      }
      const script = getJsonObjectTwoDown(deleteFilePath);
      verboseMessage(
        `Deleting script ${script._id} in realm "${state.getRealm()}"...`
      );
      // const outcome = await deleteScriptId(script._id);
      logmessages.push(`delete script ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete script ${deleteFilePath}\n`);
      break;
    }
    case 'service': {
      // Need to test this to make sure it really deletes how it should
      const service = getJsonObjectOneDown(deleteFilePath);
      const serviceId = Object.keys(service)[0];
      verboseMessage(`service Id: ${serviceId}`);
      // const outcome = await deleteService(serviceId, global);
      logmessages.push(`delete service ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete service ${deleteFilePath}\n`);
      break;
    }
    case 'theme': {
      // const theme = getJsonObjectTwoDown(deleteFilePath);
      // verboseMessage(
      //   `Deleting theme with id "${
      //     theme._id
      //   }" from realm "${state.getRealm()}"...`
      // );
      // //const outcome = await deleteTheme(theme._id);
      // logmessages.push(`delete theme ${deleteFilePath}`);
      // //logmessages.push(`outcome: ${outcome}`)
      // logmessages.push(' ');
      // verboseMessage(`delete theme ${deleteFilePath}\n`);
      break;
    }
    case 'emailTemplate': {
      // No delete written for email template yet
      logmessages.push(`No delete written for emailTemplate yet`);
      logmessages.push(`delete emailTemplate ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`No delete written for emailTemplate yet`);
      verboseMessage(`delete emailTemplate ${deleteFilePath}\n`);
      break;
    }
    case 'idm': {
      // No delete fo IDM right now
      logmessages.push(`No delete written for idm`);
      logmessages.push(`delete idm ${deleteFilePath}`);
      //logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete idm ${deleteFilePath}\n`);
      break;
    }
    case 'secret': {
      const secret = getJsonObjectTwoDown(deleteFilePath);
      verboseMessage(`Deleting secret with id ${secret._id}`);
      // const outcome = await deleteSecret(secret._id);
      logmessages.push(`delete secret ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete secret ${deleteFilePath}\n`);
      break;
    }
    case 'sync': {
      const data = fs.readFileSync(deleteFilePath, 'utf8');
      const sync = JSON.parse(data);
      verboseMessage(`sync Id: ${sync._id}`);
      // const outcome = await deleteMapping(sync._id);
      logmessages.push(`delete sync ${deleteFilePath}`);
      //logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete sync ${deleteFilePath}\n`);
      break;
    }
    case 'variable': {
      const variable = getJsonObjectTwoDown(deleteFilePath);
      verboseMessage(`Deleting variable with id: ${variable._id}`);
      // const outcome = await deleteVariableById(variable._id);
      logmessages.push(`delete variable ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete variable ${deleteFilePath}\n`);
      break;
    }
    case 'saml': {
      // Todo get entity Id
      // await deleteSaml2Provider(entityId: string)
      logmessages.push(`delete saml ${deleteFilePath}`);
      logmessages.push(' ');
      verboseMessage(`delete saml ${deleteFilePath}\n`);
      break;
    }
    case 'mapping': {
      const data = fs.readFileSync(deleteFilePath, 'utf8');
      const mapping = JSON.parse(data);
      verboseMessage(`mapping Id: ${mapping._id}`);
      // const outcome = await deleteMapping(mapping._id);
      logmessages.push(`delete mapping ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete mapping ${deleteFilePath}\n`);
      break;
    }
    case 'agents': {
      // TODO: get Agent Id
      // verboseMessage(
      //   `Deleting agent '${
      //     options.agentId
      //   }' in realm "${state.getRealm()}"...`
      // );
      // const outcome = await deleteAgent(options.agentId);
      logmessages.push(`delete agents ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete agents ${deleteFilePath}\n`);
      break;
    }
    case 'idp': {
      // No current delete for IDP
      logmessages.push(`No delete for idp written`);
      logmessages.push(`delete idp ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete idp ${deleteFilePath}\n`);
      break;
    }
    case 'policy': {
      // TODO: look at policy file to make sure I'm getting the Id correctly
      const policy = getJsonObjectTwoDown(deleteFilePath);
      verboseMessage(`policy id: ${policy._id}`);
      // const outcome = await deletePolicyById(policy._id);
      logmessages.push(`delete policy ${deleteFilePath}`);
      // logmessages.push(`outcome: ${outcome}`)
      logmessages.push(' ');
      verboseMessage(`delete policy ${deleteFilePath}\n`);
      break;
    }
    default: {
      logmessages.push(
        `No delete ${deleteFilePath} not setup for type ${type}`
      );
      logmessages.push(' ');
      verboseMessage(`No delete ${deleteFilePath} not setup for type ${type}\n`);
      break;
    }
  }
}

interface CompareObj {
  added: string[];
  changed: string[];
  deleted: string[];
}

function getJsonObjectTwoDown(filePath: string): any {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const fileData = JSON.parse(data);
    const jsonObject = fileData[Object.keys(fileData)[0]];
    return jsonObject[Object.keys(jsonObject)[0]];
  } catch {
    console.error('error in json parsing');
  }
}

function getJsonObjectOneDown(filePath: string): any {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const fileData = JSON.parse(data);
    return fileData[Object.keys(fileData)[0]];
  } catch {
    console.error('error in json parsing');
  }
}

function setRealmFromPath(path: string, inRealm: boolean) {
  if (inRealm) {
    let realm = path.substring(
      path.indexOf('/') + 1,
      path.indexOf('/', path.indexOf('/') + 1)
    );
    realm = getRealmUsingExportFormat(realm);
    verboseMessage(`realm = ${realm}`);
    state.setRealm(realm);
  }
}

function getTypeFromPath(path: string): string {
  let type: string;
  if (path.includes('idm')) {
    type = 'idm';
  } else {
    type = path.substring(
      path.substring(0, path.lastIndexOf('/')).lastIndexOf('/') + 1,
      path.lastIndexOf('/')
    );
  }
  return type;
}
