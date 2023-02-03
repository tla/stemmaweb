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
}
