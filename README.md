# Marvel actors and movies API assignment


### Install dependencies

Before starting to code, don't forget to install all dependencies.



Initialize a new Node.js project with the following command:


```shell
npm init -y
```

Install Express.js as a dependency:


```shell
npm install express
```

To run your server, execute the following command in your terminal:

```shell
node index.js
```


Your web server is now running, and you can access the endpoint using a tool like curl or Postman.



### Header and Auth

```shell
{'x-api-key', 'vi50572182la567845ao'}
```


### Q&A Via API


1. Which Marvel movies did each actor play in?
Api definition: [GET] /moviesPerActor

```shell
curl "http://localhost:3000/moviesPerActor"
```


2. Who are the actors who played more than one Marvel character?
Api definition: [GET] /actorsWithMultipleCharacters


```shell
curl "http://localhost:3000/actorsWithMultipleCharacters"
```


3. Roles (characters) that were played by more than one actor?
Api definition: [GET] /charactersWithMultipleActors


```shell
curl "http://localhost:3000/charactersWithMultipleActors"
```




