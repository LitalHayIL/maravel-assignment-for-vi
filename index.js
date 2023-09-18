const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000; // You can choose any available port
const apiKey = 'ac505a02032a33d65dd28b41f72182e1';
const restrictedApiKey = 'vi50572182la567845ao';

app.use(express.json());

// auth api check
function authenticateApiKey(req, res, next) {
  const providedApiKey = req.headers['x-api-key'];
  if (!providedApiKey || providedApiKey !== restrictedApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(authenticateApiKey);

// Define the REST endpoint for getting movies per actor
app.get('/moviesPerActor', async (req, res) => {
  try {
    const actorName = req.query.actorName;
    
    const actorTMDbAPI = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${actorName}`;
    const actorTMDbAPIResponse = await axios.get(actorTMDbAPI);
    
    const actorTMDbId = actorTMDbAPIResponse.data.results[0]?.id;

    if (!actorTMDbId) {
      return res.status(404).json({ error: 'Actor not found' });
    }

    const actorMoviesCredit = `https://api.themoviedb.org/3/person/${actorTMDbId}/movie_credits?api_key=${apiKey}`;
    const actorMoviesCreditResponse = await axios.get(actorMoviesCredit);

    const acterMovies = actorMoviesCreditResponse.data.cast.map(movie => movie.title);

    const response = { actorName, acterMovies };
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
