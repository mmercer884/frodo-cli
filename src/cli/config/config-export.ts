import { state } from '@rockcarver/frodo-lib';
import { Option } from 'commander';

import * as s from '../../help/SampleData';
import { getTokens } from '../../ops/AuthenticateOps';
import {
  exportEverythingToFile,
  exportEverythingToFiles,
} from '../../ops/ConfigOps';
import { printMessage, verboseMessage } from '../../utils/Console';
import { FrodoCommand } from '../FrodoCommand';

export default function setup() {
  const program = new FrodoCommand('frodo config export');

  program
    .description(
      'Export full cloud configuration for all ops that currently support export.'
    )
    .addOption(new Option('-f, --file <file>', 'Name of the export file.'))
    .addOption(new Option('-a, --all', 'Export everything to a single file.'))
    .addOption(
      new Option(
        '-A, --all-separate',
        'Export everything to separate files in the -D directory. Ignored with -a.'
      )
    )
    .addOption(
      new Option(
        '--use-string-arrays',
        'Where applicable, use string arrays to store multi-line text (e.g. scripts).'
      ).default(false, 'off')
    )
    .addOption(
      new Option(
        '--no-decode',
        'Do not include decoded variable value in variable export'
      ).default(false, 'false')
    )
    .addOption(
      new Option(
        '-x, --extract',
        'Extract scripts from the exported file, and save it to a separate file. Ignored with -a.'
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
        '--no-coords',
        'Do not include the x and y coordinate positions of the journey/tree nodes.'
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
        '--include-active-values',
        'Include the currently active (and loaded) secret value in the export. By default, secret values are encrypted server-side in the environment they are exported from. Use --target <host url> to have another environment perform the encryption.'
      )
    )
    .addOption(
      new Option(
        '--target <host url>',
        'Host URL of the environment to perform secret value encryption. The URL must resolve to an existing connection profile. Use this option to generate an export that can be imported into the target environment without requiring admin access to the source environment.'
      )
    )
    .addHelpText(
      'after',
      `How Frodo handles secrets:\n`['brightGreen'] +
        `  Frodo supports exporting and importing of ESV secret values. To leave stuartship of secret values with the cloud environment where they belong, frodo always encrypts values using either encryption keys from the source environment (default) or the target environment (--target parameter). Frodo never exports secrets in the clear.\n\n`[
          'brightGreen'
        ] +
        `Usage Examples:\n` +
        `  Backup global and active realm configuration including active secret values to a single file (Note: only values of active and loaded secrets can be exported):\n` +
        `  $ frodo config export -a --include-active-values ${s.connId}\n`[
          'brightCyan'
        ] +
        `  Backup global and active realm configuration including active secret values to individual files in a directory structure (Note: only values of active and loaded secrets can be exported):\n` +
        `  $ frodo config export -A -D ${s.connId}-backup --include-active-values ${s.connId}\n`[
          'brightCyan'
        ] +
        `  Export global and active realm configuration including active secret values for import into another environment.\n` +
        `  The --target parameter instructs frodo to encrypt the exported secret values using the target environment so they can be imported into that target environment without requiring the source environment they were exported from.\n` +
        `  Using the --target parameter, the target environment must be available at the time of export and the person performing the export must have a connection profile for the target environment.\n` +
        `  Without the --target parameter, the source environment must be available at the time of import and the person performing the import must have a connection profile for the source environment.\n` +
        `  $ frodo config export -a --include-active-values --target ${s.connId2} ${s.connId}\n`[
          'brightCyan'
        ]
    )
    .action(
      // implement command logic inside action handler
      async (host, realm, user, password, options, command) => {
        command.handleDefaultArgsAndOpts(
          host,
          realm,
          user,
          password,
          options,
          command
        );
        // --all -a
        if (options.all && (await getTokens())) {
          verboseMessage('Exporting everything to a single file...');
          const outcome = await exportEverythingToFile(
            options.file,
            options.metadata,
            {
              useStringArrays: options.useStringArrays,
              noDecode: options.decode,
              coords: options.coords,
              includeDefault: options.default,
              includeActiveValues: options.includeActiveValues,
              target: options.target,
            }
          );
          if (!outcome) process.exitCode = 1;
        }
        // require --directory -D for all-separate function
        else if (options.allSeparate && !state.getDirectory()) {
          printMessage(
            '-D or --directory required when using -A or --all-separate',
            'error'
          );
          program.help();
          process.exitCode = 1;
        }
        // --all-separate -A
        else if (options.allSeparate && (await getTokens())) {
          verboseMessage('Exporting everything to separate files...');
          const outcome = await exportEverythingToFiles(
            options.extract,
            options.metadata,
            {
              useStringArrays: options.useStringArrays,
              noDecode: options.decode,
              coords: options.coords,
              includeDefault: options.default,
              includeActiveValues: options.includeActiveValues,
              target: options.target,
            }
          );
          if (!outcome) process.exitCode = 1;
        }
        // unrecognized combination of options or no options
        else {
          verboseMessage(
            'Unrecognized combination of options or no options...'
          );
          program.help();
          process.exitCode = 1;
        }
      }
      // end command logic inside action handler
    );

  return program;
}
