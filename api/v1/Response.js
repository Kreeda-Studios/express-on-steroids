/* eslint-disable no-unused-vars */
// used in docstrings, for providing helpful code suggestions.
const express = require("express");
/* eslint-enable no-unused-vars */

const CustomError = require("../CustomError");

const RESPONSE_SCHEMA_FILENAME = "response-schema.json";

/**
 * #### Acts as a wrapper for *expressResponse*, providing additional functionalities.
 *  * allows response formatting according to requested responseSchema
 *  * validates for presence of basic keys in each api response.
 * **Version 1**
 */
class Response {
  #response; // actual express.response object that will be maintained internally to communicate with client.
  #responseData; // json object which will be sent with res.json(responseData).
  /** @type Number */
  #status; // status code that will be sent to client with res.status(status).
  #support; // responseSchema in support helps determine what schema to load from response-schema.json for formatting the responseData.
  #version = "v1";

  /**
   *
   * @param {express.Response} expressResponse
   * @param {{}} support
   */
  constructor(expressResponse, support) {
    if (!expressResponse) {
      console.error(
        "expressResponse not accessible from Response, initialising Response fails."
      );
      throw new CustomError();
    }
    this.#response = expressResponse;
    this.#support = support || {};
    this.setStatus(500);
    this.#responseData = { message: "default response message.", status: 500 };
  }

  // ==========================
  // express response functions
  // ==========================

  /**
   * redirects to `url`
   * @param {String} url redirect url
   * @param {Number} statusCode optional redirect status code.
   */
  redirect(url, statusCode = 302) {
    if (this.isSent() || !url) return;
    this.#response.redirect(statusCode, url);
  }

  /**
   * wraps expressResponse.sendStatus(), silently validates code
   *  * if invalid code, 500 is sent by default.
   * @param {Number} code
   */
  sendStatus(code) {
    /*eslint-disable eqeqeq */
    // DO NOT EDIT
    let statusCode = code;
    if (code && typeof code === "string" && Number(code) == code) {
      /*eslint-enable eqeqeq */
      statusCode = Number(code);
    }
    if (this.#validateStatusCode(statusCode)) {
      if (this.isSent()) return;
      return this.#response.sendStatus(statusCode);
    }
    console.warn("invalid status code provided, sending 500");
    return this.#response.sendStatus(500);
  }

  // =============================
  // Exposed methods
  // =============================

  /**
   * * constructs a formatted response based on schema definition in response-schema.json
   * * validates the response data based on the basic response schema definition in config.json
   * * prepares response and status that will be communicated to client.
   *
   * chain .send() function call to send response.
   * @param {{}} responseData
   * @returns {this}
   */
  handling(responseData, skipBasicResponseSchemaValidation) {
    this.#support.skipBasicResponseSchemaValidation =
      skipBasicResponseSchemaValidation;
    if (!responseData) {
      console.error(
        "handler didn't return anything, skipping response handling."
      );
      return this;
    }
    this.#setResponseData(responseData);
    const specifiedResponseSchema = this.#getSpecifiedResponseSchema();
    if (
      specifiedResponseSchema &&
      Object.keys(specifiedResponseSchema).length > 0
    ) {
      this.#setResponseData(
        this.#formatResponseData(responseData, specifiedResponseSchema)
      );
    }
    this.#validateResponseData(this.#getResponseData());
    this.setStatus(this.#getResponseData().status);
    return this;
  }

  /**
   * validates and stores response code.
   *  * if validation fails
   *      * existing status value will persist.
   * @param {Number} code
   * @returns
   */

  setStatus(code) {
    if (!code) return;
    /*eslint-disable eqeqeq */
    // DO NOT EDIT
    let statusCode = code;
    if (typeof code === "string" && Number(code) == code) {
      /*eslint-enable eqeqeq */
      statusCode = Number(code);
    }
    if (this.#validateStatusCode(statusCode)) {
      this.#status = statusCode;
      return true;
    }
    if (!this.#status) this.#status = 500;
    return false;
  }

  /**
   * exposes status code that will be sent to client.
   * @returns statuscode
   */
  getStatus() {
    return this.#status;
  }

  /**
   * checks if response is sent to client.
   * @returns {Boolean} true if responded.
   */
  isSent() {
    return this.#response.headersSent;
  }

  /**
   * send() should only be called after calling handling(responseData);
   * responds to the client with status and responseData.
   * @param {{}} responseData
   * @dependsOn handling()
   * @sideEffect if handling is not called default response will be sent.
   */
  send() {
    !this.isSent() &&
      this.#response.status(this.getStatus()).json(this.#getResponseData());
  }

  // =================================
  // Private methods
  // =================================

  /**
   * returns private instance variable `responseData`.
   * @returns {{}} responseData
   */
  #getResponseData() {
    return this.#responseData;
  }

  /**
   * Dumb method which accepts json object `data` and stores it as an instance variable, for using with `res.json()`
   * * No key validation is done
   * * No formatting is done
   * @param {{}} data validated formatted json object which will be used with res.json
   */
  #setResponseData(data) {
    if (!data || typeof data !== "object") return false;
    this.#responseData = data;
  }

  /**
   * creates a new object, adds basic keys to it from `original`. Adds values from original, based on mapping defined in `requiredKeys`
   * @param {{}} original adaptee
   * @param {{}} requiredKeys target interface
   * @returns
   */
  #formatResponseData(original, requiredKeys) {
    if (!requiredKeys) return original;
    const newResponse = {};
    this.#addBasicSchemaFields(newResponse, original);
    // handler's returned object = {fullName: "abc xyz", phone: "1234321"}
    // frontend's required response structure = {name: "abc xyz", mobile: "1234321"};
    // required keys mapping, defined in response-schema.json = {name: fullName, mobile: phone, \<frontEnd'sExpectedKey>: \<backend'sReturnKey>}
    this.#adapt(newResponse, original, requiredKeys);
    return newResponse;
  }

  /**
   * loads basic response schema, and assigns fields from `from` to `to`
   * @sideeffect overrides existing keys.
   * @param {{}} to object to which fields will be added
   * @param {{}} from object from which fields will be read
   * @returns
   */
  #addBasicSchemaFields(to, from) {
    const basicSchema = this.#getBasicSchema();
    if (basicSchema) {
      for (let key of basicSchema) {
        if (!from[key]) {
          console.warn(
            `cannot add key ${key}, as from[${key}] is null @ Response.addBasicSchemaFields()`
          );
          continue;
        }
        to[key] = from[key];
      }
    }
  }

  /**
   * converts `originalStructure` to a client expected structure (`clientData`) based on `keyMapping`
   * @sideeffect overrides existing keys
   * @param {{}} clientData object to which new keys will be added
   * @param {{}} originalStructure returned by handler function
   * @param {{}} keyMapping mapping that defines the relationship between original keys and client expected keys
   */
  #adapt(clientData, originalStructure, keyMapping) {
    // key mapping is clientKey -> backendKey;
    for (let clientExpectedKey of Object.keys(keyMapping)) {
      const originalsKey = keyMapping[clientExpectedKey];
      if (!originalStructure[originalsKey]) {
        clientData[clientExpectedKey] = null;
        continue;
      }
      clientData[clientExpectedKey] = originalStructure[originalsKey];
    }
  }

  // ==============================
  // JSON loaders (private)
  // ==============================

  /**
   * if schema is defined in v1/response-schema.json[this.#support.responseSchema[0]], it will be returned.
   */
  #getSpecifiedResponseSchema() {
    if (!this.#support || !this.#support.responseSchema) {
      // no response schema requested.
      return;
    }
    const schemaName = this.#support.responseSchema[0];
    if (this.#support.responseSchema.length > 1) {
      console.warn(
        `client requested for multiple responseSchema, only applying ${schemaName}`
      );
    }
    if (schemaName) {
      try {
        return require(`./${RESPONSE_SCHEMA_FILENAME}`)[schemaName];
      } catch (error) {
        // `no schema "${schemaName}" found in response-schema.json, no response schema will be applied.`
        console.error(error);
      }
    }
    return null;
  }

  /**
   * imports and returns a list of keys that must be present in responseData.
   * @returns {Array<String>} List of strings
   */
  #getBasicSchema() {
    const BASIC_SCHEMA_NAME = "requiredKeys";
    try {
      let basicKeys = require("../../config.js")["response"][BASIC_SCHEMA_NAME];
      return basicKeys.filter((item) => item !== "");
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  // ===================================
  // Validators (private)
  // ===================================

  /**
   * all responseData validators start here.
   * @param {{}} responseData original response object returned from some handler function.
   * @throws CustomError
   */
  #validateResponseData(responseData) {
    if (this.#support && !this.#support.skipBasicResponseSchemaValidation) {
      this.#validateResponseSchema(responseData, this.#getBasicSchema());
    }
  }

  /**
   *
   * this function relies on config.json['response']['basic'] being present, if not validation fails silently.
   * if config.json['response']['basic'] is present with some keys which are not present in raw response data, then errors are thrown
   * @param {{}} rawResponseData unformatted object which is returned by api handler function (from handlers.js)
   * @param {[]} requiredResponseKeys keys which must be present in all response data objects
   * @throws CustomError
   */
  #validateResponseSchema(rawResponseData, requiredResponseKeys) {
    if (requiredResponseKeys) {
      let availableKeys = Object.keys(rawResponseData);
      for (let key of requiredResponseKeys) {
        if (!availableKeys.includes(key)) {
          console.error(
            `key '${key}' must be present in handler's return object. validating response schema fails.`
          );
          throw new CustomError();
        }
      }
    }
    // validation succeeded nothing to do.
    return true;
  }

  /**
   * silently validates status code
   * @param {Number} code
   * @returns {boolean} true if validationSuccess
   */
  #validateStatusCode(code) {
    if (!code) {
      return false;
    }
    if (typeof code !== "number") {
      return false;
    }
    let HTTP_STATUSCODE_LOWERLIMIT = 100;
    let HTTP_STATUSCODE_UPPERLIMIT = 599;
    if (
      code < HTTP_STATUSCODE_LOWERLIMIT ||
      code > HTTP_STATUSCODE_UPPERLIMIT
    ) {
      console.warn(
        `status code ${code} is out of range(${HTTP_STATUSCODE_LOWERLIMIT}, ${HTTP_STATUSCODE_UPPERLIMIT}).`
      );
      return false;
    }
    return true; // validation success
  }
}

module.exports = Response;
