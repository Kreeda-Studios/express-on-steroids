class CustomError {
  #json;
  constructor(message, statusCode) {
    this.message = message || "custom error with no message";
    this.statusCode = statusCode || 500;
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
