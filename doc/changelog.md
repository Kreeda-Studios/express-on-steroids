# Changelog
### Module versioning
Currently express-on-steroids is being versioned as per the standard Major.Minor.Patch versioning scheme.

## Initial Version (1.0.0)

### Proposals for 1.0.1. 22nd Feb, 2023
#### Getters
Add [getters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) to Request class, so that it follows similar interface to *express.Request* .  

E.g.:  
Current API for reading request body:
```js
class Request{
  ...
  getBody(){
    return this.#request.body;
  }
  ...
}
let request = new Request(expressRequest);
console.log(request.getBody())
```
After adding *getters*:
```js
class Request{
  ...
  get body(){
    return this.#request.body
  }
  ...
}
let request = new Request(expressRequest);
console.log(request.body)
```

<!-- #### Terminology makeover
*handleRequest()*, which is the bridge between express and express-on-steroids, to *main()* . And Rename the *controller.js* file, the one which contains handleRequest(), to *eosBridge.js* . -->