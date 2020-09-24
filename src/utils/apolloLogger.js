/* eslint no-shadow: ["error", { "allow": ["requestContext"] }] */

const prettier = require('prettier');
const config = require('../config.js');

const DEFAULT_TRUNCATE_LENGTH = 4096;

function truncate(str, l = DEFAULT_TRUNCATE_LENGTH) {
  if (str.length <= l) {
    return str;
  }
  return `${str.slice(0, l)}...`;
}

module.exports = {
  requestDidStart(requestContext) {
    if (requestContext.request.query.startsWith('query IntrospectionQuery')) {
      return {};
    }

    const query = truncate(prettier.format(requestContext.request.query, { parser: 'graphql' }));
    const vars = truncate(JSON.stringify(requestContext.request.variables, null, 2));
    config.logger.debug(requestContext.context, `GraphQL request started:\n${query}\nvariables:\n${vars}`);

    return {
      didEncounterErrors(requestContext) {
        const errors = truncate(JSON.stringify(requestContext.errors));
        config.logger.error(requestContext.context, `GraphQL encountered errors:\n${errors}`);
      },
      willSendResponse(requestContext) {
        const respData = truncate(JSON.stringify(requestContext.response.data));
        config.logger.debug(requestContext.context, `GraphQL request completed:\n${respData}`);
      },
    };
  },
};
