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


async function fetchActorId(actorName) {
  const actorSearchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${actorName}`;
  const actorSearchResponse = await axios.get(actorSearchUrl);
  const actorId = actorSearchResponse.data.results[0]?.id;
  return actorId;
}

async function fetchMovieCreditsById(movieId) {
  const movieCreditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDbApiKey}`;
  const movieCreditsResponse = await axios.get(movieCreditsUrl);
  return movieCreditsResponse.data.cast;
}

// REST API for answering the Q: Which Marvel movies did each actor play in?

app.get('/moviesPerActor', async (req, res) => {
  try {
    const actorName = req.query.actorName;

    // Fetch the actor's ID based on the provided actor name
    const actorId = await fetchActorId(actorName);

    if (!actorId) {
      return res.status(404).json({ error: 'Actor not found' });
    }

    // Use TMDb API to fetch movie credits for the actor
    const actorCredits = await fetchMovieCreditsById(actorId);

    // Extract Marvel movie titles from the credits
    const marvelMovies = actorCredits.filter(movie => movie.genre_ids.includes(28));
    const movieTitles = marvelMovies.map(movie => movie.title);

    // Return the response in the specified structure
    const response = { actorName, movies: movieTitles };
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
