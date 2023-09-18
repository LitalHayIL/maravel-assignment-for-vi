const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000; // You can choose any available port
const apiKey = 'ac505a02032a33d65dd28b41f72182e1';
const restrictedApiKey = 'vi50572182la567845ao';

app.use(express.json());

// Middleware to check for API key in headers
function authenticateApiKey(req, res, next) {
  const providedApiKey = req.headers['x-api-key'];
  if (!providedApiKey || providedApiKey !== restrictedApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(authenticateApiKey);


function removeFromString(arr, str) {
  const regex = new RegExp(`\\b(?:${arr.join('|')})\\b`, 'gi');
  let result = str.replace(regex, '');

  result = result.replace(/\(\s*\)/g, '');
  result = result.replace(/\s+/g, ' ');

  result = result.trim();

  return result;
}


async function fetchActorId(actorName) {
  try {
    const actorSearchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${actorName}`;
    const actorSearchResponse = await axios.get(actorSearchUrl);
    const actorId = actorSearchResponse.data.results[0]?.id;
    return actorId;
  } catch (error) {
    throw error;
  }
}

async function fetchActorMovieCredits(actorId) {
  try {
    const actorCreditsUrl = `https://api.themoviedb.org/3/person/${actorId}/movie_credits?api_key=${apiKey}`;
    const actorCreditsResponse = await axios.get(actorCreditsUrl);
    return actorCreditsResponse.data.cast;
  } catch (error) {
    throw error;
  }
}

// async function fetchMarvelMoviesId(marvelCompaniesIds) {
//   try {
//     const marvelMoviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&with_companies=${marvelCompaniesIds}`;
//     const marvelMoviesResponse = await axios.get(marvelMoviesUrl);
//     return marvelMoviesResponse.data.results.map(movie => movie.id);
//   } catch (error) {
//     throw error;
//   }
// }

async function searchCompanyByNameAndCountry(companyName, country) {
  try {
    // Perform a search for the company by name
    const searchResponse = await axios.get('https://api.themoviedb.org/3/search/company', {
      params: {
        query: companyName,
        api_key: apiKey,
      },
    });

    if (searchResponse.status !== 200) {
      throw new Error(`Error: ${searchResponse.status} - ${searchResponse.statusText}`);
    }

    const companyResults = searchResponse.data.results;

    // Filter companies by origin country (e.g., 'US')
    const filteredCompanies = companyResults.filter((company) =>
      company.origin_country === country
    );

    // Extract company IDs and join them with '|'
    const companyIds = filteredCompanies.map((company) => company.id).join('|');

    return companyIds;
  } catch (error) {
    throw new Error(`Error: ${error.message}`);
  }
}

async function fetchMarvelMoviesId(marvelCompaniesIds) {
  try {
    let page = 1;
    let allMovieIds = [];

    while (true) {
      const marvelMoviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&with_genres=878&with_companies=${marvelCompaniesIds}&page=${page}`;
      const marvelMoviesResponse = await axios.get(marvelMoviesUrl);
      

      if (marvelMoviesResponse.status !== 200) {
        throw new Error(`Error: ${marvelMoviesResponse.status} - ${marvelMoviesResponse.statusText}`);
      }

      const movieResults = marvelMoviesResponse.data.results;
      const movieIds = movieResults.map(movie => movie.id);

      page++;

      if (page > marvelMoviesResponse.data.total_pages) {
        break; 
      }

      allMovieIds = allMovieIds.concat(movieIds);
    }

    return allMovieIds;
  } catch (error) {
    throw new Error(`Error: ${error.message}`);
  }
}

async function findActorsWithMultipleMarvelCharacters(marvelMovieIds) {
  try {

    const actorDataMap = new Map();

    for (const movieId of marvelMovieIds) {
      // Fetch movie details to retrive the list of cast
      const movieDetails = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}`);

      // Check if the 'cast' property exists in the response
      if (movieDetails.data && Array.isArray(movieDetails.data.cast)) {
        const cast = movieDetails.data.cast;

        // Update the actorDataMap with the actor and character data
        for (const actor of cast) {
          const actorId = actor.id;

          const actorName = actor.name;
          const characterName = (removeFromString(["(uncredited)","(voice)","(archive footage)"], actor.character)).toLowerCase();

          if (!actorDataMap.has(actorId)) {
            actorDataMap.set(actorId, { name: actorName, characters: new Set() });
          }

          actorDataMap.get(actorId).characters.add(characterName);
        }
      }
    }

    // Find actors who played more than one Marvel character
    const actorsWithMultipleCharacters = [];
    for (const [actorId, actorInfo] of actorDataMap.entries()) {
      if (actorInfo.characters.size > 1) {
        actorsWithMultipleCharacters.push({ actorName: actorInfo.name, charactersPlayed: [...actorInfo.characters] });
      }
    }

    return actorsWithMultipleCharacters;
  } catch (error) {
    console.error(error);
    throw new Error('Error finding actors with multiple Marvel characters');
  }
}

// REST API for answering the question: Which Marvel movies did each actor play in?
app.get('/moviesPerActor', async (req, res) => {
  try {
    const actorName = req.query.actorName;

    // Fetch the actor's ID based on the provided actor name
    const actorId = await fetchActorId(actorName);

    if (!actorId) {
      return res.status(404).json({ error: 'Actor not found' });
    }

    // Use TMDb API to fetch movie credits for the actor
    const actorCredits = await fetchActorMovieCredits(actorId);

    // Extract Marvel movie titles from the credits
    const marvelMovies = actorCredits.filter(movie => movie.genre_ids.includes(28));

    console.log('marvelMovies:', marvelMovies);

    const movieTitles = marvelMovies.map(movie => movie.title);

    // Return the response in the specified structure
    const response = { actorName, movies: movieTitles };
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// REST API for answering the question: Who are the actors who played more than one Marvel character?
app.get('/actorsWithMultipleCharacters', async (req, res) => {
  try {
    // Fetch Marvel ID
    const marvelCompaniesIds = await searchCompanyByNameAndCountry('Marvel', 'US')

    // Fetch Marvel movie IDs
    const marvelMovieIds = await fetchMarvelMoviesId(marvelCompaniesIds);

    // Fetch a list of Marvel actors that play multiple roles
    const actorsWithMultipleMarvelCharacters = await findActorsWithMultipleMarvelCharacters(marvelMovieIds);

    res.json(actorsWithMultipleMarvelCharacters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
