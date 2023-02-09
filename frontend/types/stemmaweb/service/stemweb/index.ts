import { Overwrite } from '../../utils';

export interface DjangoModel<T> {
  model: string;
  pk: number;
  fields: T;
}

/** {@link https://github.dev/DHUniWien/Stemweb/blob/ba236bddb3b869d6d7ff3d7ff9c0d894a2c9a6cb/Stemweb/algorithms/settings.py#L56-L63| Stemweb/algorithms/settings.py} */
export type AlgorithmArgValue =
  | 'positive_integer'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'string'
  | 'input_file';

/** {@link https://github.dev/DHUniWien/Stemweb/blob/ba236bddb3b869d6d7ff3d7ff9c0d894a2c9a6cb/Stemweb/algorithms/models.py#L24| Stemweb/algorithms/models.py} */
export interface AlgorithmArg {
  key: string;
  value: AlgorithmArgValue;
  name: string;
  description?: string;
  external: boolean;
}

/** {@link https://github.dev/DHUniWien/Stemweb/blob/ba236bddb3b869d6d7ff3d7ff9c0d894a2c9a6cb/Stemweb/algorithms/models.py#L57| Stemweb/algorithms/models.py} */
export interface Algorithm {
  desc?: string;
  template?: string;
  paper?: string;
  url?: string;
  name: string;
  source: string | null;
  stoppable: boolean;
  args: number[];
  file_extension: string;
}

export type DjRelOwnerManyToMany<T, K extends keyof T> = Overwrite<
  T,
  K,
  number[]
>;
export type DjRelOwnerManyToManyWithValues<T, K extends keyof T, V> = Overwrite<
  T,
  K,
  V[]
>;

/**
 * Model where the `AlgorithmArg` array is joined to the `Algorithm` object
 * based on the `AlgorithmArg` primary keys.
 */
export type AlgorithmWithArgs = DjRelOwnerManyToManyWithValues<
  Algorithm,
  'args',
  DjangoModel<AlgorithmArg>
>;

export interface RunAlgorithmDTO {
  userid: string;
  textid: string;
  data: string;
  parameters: object;
  return_host: string;
  return_path: string;
}

export interface RunAlgorithmStatusResponse {
  jobid: number;
  status: number;
}

export interface RunJobResult {
  jobid: string;
  start_time: string;
  end_time: string;
  status: number;
  algorithm: string;
  userid: string;
  textid: string;
  parameters: object;
  return_host: string;
  return_path: string;
  format: string;
  result: string;
}
