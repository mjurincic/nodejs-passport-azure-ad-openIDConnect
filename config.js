const joi = require('joi');
require('dotenv').config();

// Check for required env variables and their types.
const envVarsSchema = joi
  .object({
    NODE_ENV: joi
      .string()
      .valid(['development', 'production', 'test', 'provision'])
      .required(),
    HOST: joi.string().hostname(),
    PORT: joi.number().required(),
    LOGGER_LEVEL: joi
      .string()
      .valid(['error', 'warn', 'info', 'verbose', 'debug', 'silly'])
      .default('info'),
    LOGGER_ENABLED: joi
      .boolean()
      .truthy('TRUE')
      .truthy('true')
      .falsy('FALSE')
      .falsy('false')
      .default(true),
    AZURE_AD_TENANT_GUID: joi.string().guid(),
    AZURE_AD_CLIENT_ID: joi.string().guid(),
    AZURE_AD_CLIENT_SECRET: joi.string(),
    DATABASE_MONGO_URI: joi.string().uri({
      scheme: ['mongodb']
    })
  })
  .required();

const { error, value: envVars } = joi.validate(process.env, envVarsSchema, {
  abortEarly: false,
  convert: true,
  allowUnknown: true
});
if (error) {
  throw new Error(`Environment variables validation error: ${error.message}`);
}

module.exports = {
  creds: {
    // Required
    // 'https://login.microsoftonline.com/<tenant_name>.onmicrosoft.com/.well-known/openid-configuration'
    // or equivalently: 'https://login.microsoftonline.com/<tenant_guid>/.well-known/openid-configuration'
    //
    // or you can use the common endpoint
    // 'https://login.microsoftonline.com/common/.well-known/openid-configuration'
    // To use the common endpoint, you have to either set `validateIssuer` to false, or provide the `issuer` value.
    identityMetadata: `https://login.microsoftonline.com/${
      envVars.AZURE_AD_TENANT_GUID
    }/.well-known/openid-configuration`,

    // Required, the client ID of your app in AAD
    clientID: envVars.AZURE_AD_CLIENT_ID,

    // Required, must be 'code', 'code id_token', 'id_token code' or 'id_token'
    responseType: 'code id_token',

    // Required
    responseMode: 'form_post',

    // Required, the reply URL registered in AAD for your app
    redirectUrl: `http://${envVars.HOST}:${envVars.PORT}/auth/openid/return`,

    // Required if we use http for redirectUrl
    allowHttpForRedirectUrl: true,

    // Required if `responseType` is 'code', 'id_token code' or 'code id_token'.
    // If app key contains '\', replace it with '\\'.
    clientSecret: envVars.AZURE_AD_CLIENT_SECRET,

    // Required to set to false if you don't want to validate issuer
    validateIssuer: true,

    // Required to set to true if you are using B2C endpoint
    // This sample is for v1 endpoint only, so we set it to false
    isB2C: false,

    // Required if you want to provide the issuer(s) you want to validate instead of using the issuer from metadata
    issuer: null,

    // Required to set to true if the `verify` function has 'req' as the first parameter
    passReqToCallback: false,

    // Recommended to set to true. By default we save state in express session, if this option is set to true, then
    // we encrypt state and save it in cookie instead. This option together with { session: false } allows your app
    // to be completely express session free.
    useCookieInsteadOfSession: true,

    // Required if `useCookieInsteadOfSession` is set to true. You can provide multiple set of key/iv pairs for key
    // rollover purpose. We always use the first set of key/iv pair to encrypt cookie, but we will try every set of
    // key/iv pair to decrypt cookie. Key can be any string of length 32, and iv can be any string of length 12.
    cookieEncryptionKeys: [
      { key: '12345678901234567890123456789012', iv: '123456789012' },
      { key: 'abcdefghijklmnopqrstuvwxyzabcdef', iv: 'abcdefghijkl' }
    ],

    // Optional. The additional scope you want besides 'openid', for example: ['email', 'profile'].
    scope: ['email', 'profile'],

    // Optional, 'error', 'warn' or 'info'
    loggingLevel: 'info',

    // Optional. The lifetime of nonce in session or cookie, the default value is 3600 (seconds).
    nonceLifetime: null,

    // Optional. The max amount of nonce saved in session or cookie, the default value is 10.
    nonceMaxAmount: 5,

    // Optional. The clock skew allowed in token validation, the default value is 300 seconds.
    clockSkew: null
  },

  resourceURL: 'https://graph.windows.net',
  // The url you need to go to destroy the session with AAD
  destroySessionUrl: `https://login.microsoftonline.com/common/oauth2/logout?post_logout_redirect_uri=http://${
    envVars.HOST
  }:${envVars.PORT}`,
  // If you want to use the mongoDB session store for session middleware; otherwise we will use the default
  // session store provided by express-session.
  // Note that the default session store is designed for development purpose only.
  useMongoDBSessionStore: false,
  // If you want to use mongoDB, provide the uri here for the database.
  databaseUri: envVars.DATABASE_MONGO_URI,
  // How long you want to keep session in mongoDB.

  mongoDBSessionMaxAge: 24 * 60 * 60 // 1 day (unit is second)
};
