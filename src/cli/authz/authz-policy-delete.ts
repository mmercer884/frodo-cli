import { FrodoCommand } from '../FrodoCommand';
import { Option } from 'commander';
import { Authenticate } from '@rockcarver/frodo-lib';
import { printMessage, verboseMessage } from '../../utils/Console.js';
import {
  deletePolicy,
  deletePolicies,
  deletePoliciesByPolicySet,
} from '../../ops/PolicyOps';

const { getTokens } = Authenticate;

const program = new FrodoCommand('frodo authz policy delete');

program
  .description('Delete authorization policies.')
  .addOption(
    new Option(
      '-i, --policy-id <policy-id>',
      'Policy id/name. If specified, -a is ignored.'
    )
  )
  .addOption(
    new Option('-a, --all', 'Delete all policies in a realm. Ignored with -i.')
  )
  .addOption(
    new Option('--set-id <set-id>', 'Policy set id/name. Ignored with -i.')
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
      // delete by id
      if (options.policyId && (await getTokens())) {
        verboseMessage('Deleting authorization policy...');
        const outcome = await deletePolicy(options.policyId);
        if (!outcome) process.exitCode = 1;
      }
      // --all -a by policy set
      else if (options.setId && options.all && (await getTokens())) {
        verboseMessage(
          `Deleting all authorization policies in policy set ${options.setId}...`
        );
        const outcome = await deletePoliciesByPolicySet(options.setId);
        if (!outcome) process.exitCode = 1;
      }
      // --all -a
      else if (options.all && (await getTokens())) {
        verboseMessage('Deleting all authorization policies...');
        const outcome = await deletePolicies();
        if (!outcome) process.exitCode = 1;
      }
      // unrecognized combination of options or no options
      else {
        printMessage('Unrecognized combination of options or no options...');
        program.help();
        process.exitCode = 1;
      }
    }
    // end command logic inside action handler
  );

program.parse();
