class CustomError {
  #json;
  /**
   * @param {String} message "something went wrong" by default
   * @param {Number} statusCode 404 by default
   */
  constructor(message, statusCode) {
    this.message = message || "something went wrong";
    this.statusCode = statusCode || 404;
    this.#json = {
      message,
      statusCode,
    };
  }

  json() {
    return {
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}
module.exports = CustomError;
