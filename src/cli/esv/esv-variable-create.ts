import { FrodoCommand } from '../FrodoCommand';
import { frodo } from '@rockcarver/frodo-lib';
import { verboseMessage } from '../../utils/Console.js';
import { createVariable } from '../../ops/VariablesOps';
import * as s from '../../help/SampleData';

const { getTokens } = frodo.login;

const program = new FrodoCommand('frodo esv variable create');

program
  .description('Create variables.')
  .requiredOption('-i, --variable-id <variable-id>', 'Variable id.')
  .requiredOption('--value <value>', 'Variable value.')
  .option('--description [description]', 'Variable description.')
  .option(
    '--variable-type [variable-type]',
    'Variable type. Must be one of "string", "list", "array", "object", "bool", "int", or "number".',
    'string'
  )
  .addHelpText(
    'after',
    `Usage Examples:\n` +
      `  Create an ESV variable using implied default type "string":\n` +
      `  $ frodo esv variable create --variable-id "esv-trinity-phone" --value "(312)-555-0690" --description "Trinity's phone number." ${s.connId}\n`[
        'brightCyan'
      ] +
      `  Create an ESV variable of type "array":\n` +
      `  $ frodo esv variable create --variable-id "esv-nebuchadnezzar-crew" --variable-type array --value '["Morpheus","Trinity","Link","Tank","Dozer","Apoc","Cypher","Mouse","Neo","Switch"]' --description "The crew of the Nebuchadnezzar hovercraft." ${s.connId}\n`[
        'brightCyan'
      ] +
      `  Create an ESV variable of type "object":\n` +
      `  $ frodo esv variable create --variable-id "esv-nebuchadnezzar-crew-structure" --variable-type object --value '{"Captain":"Morpheus","FirstMate":"Trinity","Operator":["Link","Tank"],"Medic":"Dozer","Crewmen":["Apoc","Cypher","Mouse","Neo","Switch"]}' --description "The structure of the crew of the Nebuchadnezzar hovercraft." ${s.connId}\n`[
        'brightCyan'
      ] +
      `  Create an ESV variable of type "int":\n` +
      `  $ frodo esv variable create --variable-id "esv-neo-age" --variable-type int --value '28' --description "Neo's age in the matrix." ${s.connId}\n`[
        'brightCyan'
      ] +
      `  Create an ESV variable of type "bool":\n` +
      `  $ frodo esv variable create --variable-id "esv-blue-piller" --variable-type bool --value 'false' --description "Zion membership criteria." ${s.connId}\n`[
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
      if (await getTokens()) {
        verboseMessage('Creating variable...');
        createVariable(
          options.variableId,
          options.value,
          options.description,
          options.variableType
        );
      } else {
        process.exitCode = 1;
      }
    }
    // end command logic inside action handler
  );

program.parse();
