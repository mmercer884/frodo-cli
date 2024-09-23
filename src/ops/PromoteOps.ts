import { frodo, FrodoError, state } from '@rockcarver/frodo-lib'
import { FullExportOptions } from '@rockcarver/frodo-lib/types/ops/ConfigOps';

export async function compareExportToDirectory(
  exp: string,
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
  return true;
}