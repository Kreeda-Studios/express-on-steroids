## Adding new endpoints

1. Create a category folder in `v1` directory. Name it appropriately, say `Truck`. 
2. create 2 new files in this directory, which are:
    * paths.json
    * handlers.js
3. Add following entry to `paths.json` which determines the type of request you want to serve.
```json
{
    "test": {
        "methods": ["GET"],
        "description": "test api",
        "parameters": {
            "support": [],
            "query": [],
            "headers": []
        },
        "handlers": {
            "GET": "./Truck/handlers.js->testHandler",
        },
        "middlewares": {
            "GET": []
        }   
    }
}
```
4. Add following `testHandler` function to `Truck/handlers.js`

```js
exports.testHandler = async (req) => {
    return { message: "truck route working fine" };
};
```
5. Start express app, and send a GET request to the endpoint `/v1/Truck/test`
