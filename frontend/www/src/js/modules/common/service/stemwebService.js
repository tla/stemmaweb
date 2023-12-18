/**
 * @typedef {import('types/stemmaweb').KeyOf} KeyOf
 *
 * @typedef {import('types/stemmaweb').BaseResponse} BaseResponse
 *
 * @typedef {import('types/stemmaweb').DjangoModel} DjangoModel
 *
 * @typedef {import('types/stemmaweb').AlgorithmArg} AlgorithmArg
 *
 * @typedef {import('types/stemmaweb').Algorithm} Algorithm
 *
 * @typedef {import('types/stemmaweb').AlgorithmWithArgs} AlgorithmWithArgs
 *
 * @typedef {import('types/stemmaweb').DjRelOwnerManyToMany} DjRelOwnerManyToMany
 *
 * @typedef {import('types/stemmaweb').DjRelOwnerManyToManyWithValues} DjRelOwnerManyToManyWithValues
 *
 * @typedef {import('types/stemmaweb').RunAlgorithmDTO} RunAlgorithmDTO
 *
 * @typedef {import('types/stemmaweb').RunAlgorithmStatusResponse} RunAlgorithmStatusResponse
 *
 * @typedef {import('types/stemmaweb').RunJobResult} RunJobResult
 */

class StemwebModelHelper {
  static #MODEL_MAP = {
    Algorithm: 'algorithms.algorithm',
    AlgorithmArg: 'algorithms.algorithmarg'
  };

  /**
   * Utility function to check if a model matches a certain model type. This is
   * needed, since the Stemweb API returns responses with mixed model types.
   *
   * @template T
   * @param {DjangoModel<T>} model The model to check.
   * @param {string} modelType The model type to check against.
   */
  static matches(model, modelType) {
    const modelTypeExistsInMap = modelType in StemwebModelHelper.#MODEL_MAP;
    if (!modelTypeExistsInMap) {
      console.error(`Model type ${modelType} does not exist in the model map.`);
      return false;
    }
    return model.model === StemwebModelHelper.#MODEL_MAP[modelType];
  }

  /**
   * @template T
   * @template V
   * @param model {DjRelOwnerManyToMany<T, KeyOf<T>>}
   * @param relationName {KeyOf<T>}
   * @param relationArray {DjangoModel<V>[]}
   * @returns {DjangoModel<DjRelOwnerManyToManyWithValues<T, KeyOf<T>, V>>}
   */
  static joinManyToMany(model, relationName, relationArray) {
    const primaryKeysToJoin = model[relationName];
    const relationsToJoin = relationArray.filter((relation) =>
      primaryKeysToJoin.includes(relation.pk)
    );
    return {
      ...model,
      [relationName]: relationsToJoin
    };
  }
}

/**
 * Service class to interact with the Stemweb API through high-level functions.
 * The main purpose of this class is to encapsulate the logic needed for
 * communication with the REST API, such as where the REST API is deployed and
 * what endpoints are available.
 *
 * {@link https://github.com/DHUniWien/Stemweb|Stemweb Project}
 */
class StemwebService extends BaseService {
  /** @param {string} baseUrl The base URL of the Stemweb API. */
  constructor(baseUrl) {
    super(baseUrl);
  }

  /**
   * Return an `AlgorithmWithArgs` array that lists the stemmatology algorithms
   * available on the server, along with descriptions for display in a user
   * interface and option parameters that are required or recommended for their
   * use.
   *
   * @returns {Promise<BaseResponse<DjangoModel<AlgorithmWithArgs[]>>>}
   */
  listAvailableAlgorithms() {
    return this.fetch('/algorithms/available').then((response) => {
      if (response.success) {
        /** @type {(DjangoModel<Algorithm> | DjangoModel<AlgorithmArg>)[]} */
        const data = response.data;
        /** @type {DjangoModel<Algorithm>[]} */
        const algorithms = data.filter((model) =>
          StemwebModelHelper.matches(model, 'Algorithm')
        );
        /** @type {DjangoModel<AlgorithmArg>[]} */
        const algorithmArgs = data.filter((model) =>
          StemwebModelHelper.matches(model, 'AlgorithmArg')
        );
        return algorithms.map((algorithm) => {
          /** @type {KeyOf<Algorithm>} */
          const relationName = 'args';
          const fields = StemwebModelHelper.joinManyToMany(
            algorithm.fields,
            relationName,
            algorithmArgs
          );
          return {
            ...algorithm,
            fields
          };
        });
      }

      // in case of failure, just return the response with the error
      return response;
    });
  }

  /**
   * @param userid {string}
   * @param algorithmId {number}
   * @param tradid {RunAlgorithmDTO['tradid']}
   * @param data {RunAlgorithmDTO['data']}
   * @param parameters {RunAlgorithmDTO['parameters']}
   * @returns {Promise<BaseResponse<RunAlgorithmStatusResponse>>}
   */
  runAlgorithm( userid, algorithmId, tradid, data, parameters ) {
    const return_host = this.baseUrl;
    const return_path = '/result';
    /** @type {RunAlgorithmDTO} */
    const dto = { userid, tradid, data, parameters, return_host, return_path };
    return this.fetch(`/algorithms/process/${algorithmId}`, {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    });
  }

  /**
   * Lists the results of all jobs that have been run on the server by this
   * user.
   *
   * @returns {Promise<BaseResponse<RunJobResult[]>>}
   */
  listRunResults() {
    return this.fetch(`/result`).then((response) => {
      if (response.success) {
        /** @type {{ results: RunJobResult[] }} } */
        const data = response.data;
        return data.results;
      }

      // in case of failure, just return the response with the error
      return response;
    });
  }

  /**
   * Gets the result of a job identified by the supplied `jobid` that has been
   * run on the server by this user.
   *
   * This can be used to periodically poll the server for the result of a job.
   *
   * @param jobid {string} The job ID of the job to fetch the result for.
   * @returns {Promise<BaseResponse<RunJobResult | null>>}
   */
  getRunResult(jobid) {
    return this.fetch(`/result`, undefined, { jobid }).then((response) => {
      if (response.success) {
        /** @type {{ results: RunJobResult[] }} } */
        const data = response.data;
        return data.results.length > 0 ? data.results[0] : null;
      }

      // in case of failure, just return the response with the error
      return response;
    });
  }
}
