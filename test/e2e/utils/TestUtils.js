import fs from "fs";
import { promisify } from "util";
import cp from "child_process";

const exec = promisify(cp.exec);

const ansiEscapeCodes =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Remove ANSI escape codes
 * @param {string} text Text containing ANSI escape codes
 * @returns {string} Text without ANSI escape codes
 */
export function removeAnsiEscapeCodes(text) {
  return text ? text.replace(ansiEscapeCodes, '') : text;
}

/**
 * Method that runs an export command and tests that it was executed correctly.
 * @param {string} command The export command to run
 * @param {{env: Record<string, string>}} env The environment variables
 * @param {string} type The type of the file(s), e.g. script, idp, etc.
 * @param {string | undefined} fileName The file name if exporting a single file. Leave undefined if exporting (potentially) multiple files.
 * @param {string} directory The path to the directory the export files are located in. Default is the current directory "./".
 * @returns {Promise<void>}
 */
export async function testExport(command, env, type, fileName, directory = "./", checkForMetadata = true) {
  const { stdout } = await exec(command, env);
  const regex = new RegExp(fileName ? fileName : (type ? `.*\\.${type}\\.(json|js|groovy)` : `.*\\.(json|js|groovy)`));
  const filePaths = fs.readdirSync(directory).filter(n => regex.test(n)).map(n => `${directory}${directory.endsWith("/") ? '' : '/'}${n}`);
  if (fileName) {
    expect(filePaths.length).toBe(1);
  } else {
    expect(filePaths.length >= 1).toBeTruthy();
  }
  expect(removeAnsiEscapeCodes(stdout)).toMatchSnapshot();
  filePaths.forEach(path => {
    if (path.endsWith("json")) {
      const exportData = JSON.parse(fs.readFileSync(path, 'utf8'));
      if (checkForMetadata) {
        expect(exportData).toMatchSnapshot({
          meta: expect.any(Object),
        });
      } else {
        expect(exportData).toMatchSnapshot();
      }
    } else {
      const data = fs.readFileSync(path, 'utf8');
      expect(data).toMatchSnapshot();
    }
    //Delete export file
    fs.unlinkSync(path);
  });
}
