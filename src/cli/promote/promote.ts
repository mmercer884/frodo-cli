import { Option } from 'commander';

import { getTokens } from '../../ops/AuthenticateOps';
import { compareExportToDirectory } from '../../ops/PromoteOps';
import { verboseMessage } from '../../utils/Console.js';
import { FrodoCommand } from '../FrodoCommand';

const deploymentTypes = ['cloud', 'forgeops'];

export default function setup() {
  const program = new FrodoCommand('promote');

  program
    .description(
      'Run a frodo config export -NdxD [host] [realm] command, compare that to a ' +
        'master directory and output the changes'
    )
    .addHelpText(
      'after',
      `Usage Examples:\n` + `  No good help at the moment.\n`
    )
    .addOption(
      new Option(
        '-e, --frodo-export-dir <directory>',
        'The directory where the frodo export is located.'
      )
    )
    .addOption(
      new Option(
        '-M, --master-dir <directory>',
        'The directory where the master configurations is located.'
      )
    )
    .addOption(
      new Option(
        '-N, --no-metadata',
        'Does not include metadata in the export file.'
      )
    )
    .addOption(
      new Option(
        '-x, --extract',
        'Extract scripts from the exported file, and save it to a separate file. Ignored with -a.'
      )
    )
    .addOption(
      new Option(
        '-d, --default',
        'Export all scripts including the default scripts.'
      )
    )
    .addOption(
      new Option(
        '--target <host url>',
        'Host URL of the environment to perform secret value encryption. The URL must resolve to an existing connection profile. Use this option to generate an export that can be imported into the target environment without requiring admin access to the source environment.'
      )
    )
    .action(
      async (host, realm, user, password, options, command) => {
        command.handleDefaultArgsAndOpts(
          host,
          realm,
          user,
          password,
          options,
          command
        );
        if (
          (await getTokens(false, true, deploymentTypes)) &&
          options.masterDir &&
          options.frodoExportDir
        ) {
          verboseMessage('Comparing export...');
          const outcome = await compareExportToDirectory(
            options.frodoExportDir,
            options.masterDir,
          );
          console.log('done');
          if (!outcome) {
            process.exitCode = 1;
            console.error("There was an error")
          }
        } else {
          console.error('need to designate a master dir and export dir');
        }
      }
      //end command logic inside action handler
      //"/home/trivir/Frodo/golden1-git/identity-cloud-config"
    );

  return program;
}
