const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
const apiKey = 'ac505a02032a33d65dd28b41f72182e1';
const restrictedApiKey = 'vi50572182la567845ao';
const dataForQuestions = require('./dataForQuestions');

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
  const pattern = new RegExp(`\\b(?:${arr.join('|')})\\b|\\([^)]*\\)`, 'gi');
  const cleanedStr = str.replace(pattern, '').trim().replace(/\s+/g, ' ');
  const parts = cleanedStr.split('/');
  const result = parts[0].trim();

  return result;
}


async function getMovieDetailsbyID(id) {
  try {
    return result = await axios.get(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`);
  } catch (error) {
    throw error;
  }
}

async function fetchActorId(actorName) {
  try {
    const actorSearchResponse = await axios.get(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${actorName}`);
    const actorId = actorSearchResponse.data.results[0]?.id;
    return actorId;
  } catch (error) {
    throw error;
  }
}

async function fetchActorMoviesList(actorId) {
  try {
    const actorCreditsUrl = `https://api.themoviedb.org/3/person/${actorId}/movie_credits?api_key=${apiKey}`;
    const actorCreditsResponse = await axios.get(actorCreditsUrl);

    // Extract the 'original_title' from each movie and create an array
    const movieTitles = actorCreditsResponse.data.cast.map(movie => movie.original_title);

    return movieTitles;
  } catch (error) {
    throw error;
  }
}

async function fetchActorsData(actorNames) {
  try {
    const actorsData = {};

    for (const name of actorNames) {
      const actorId = await fetchActorId(name);
      const actorMoviesList = await fetchActorMoviesList(actorId);

      // Assign movies to the actor by name
      actorsData[name] = {
        movies_names: Array.from(actorMoviesList)
      };
    }

    return actorsData;

  } catch (error) {
    console.error(error);
    throw new Error('Error finding actors with multiple Marvel characters');
  }
}

async function findActorsWithMultipleMarvelCharacters(movies,actors) {
  try {
    const actorDataMap = new Map();
  
    for (const [movieName, movieId] of Object.entries(movies)) {
      const movieDetails = await getMovieDetailsbyID(movieId);
      // Check if the 'cast' property exists in the response
      if (movieDetails.data && Array.isArray(movieDetails.data.cast)) {
        const cast = movieDetails.data.cast;

        // Update the actorDataMap with the actor and character data
        for (const actor of cast) {
          const actorName = actor.name;
          const characterName = (removeFromString(["(uncredited)","(voice)","(archive footage)"], actor.character)).toLowerCase();
          const movieTitle = movieName;

          if (!actorDataMap.has(actorName)) {
            actorDataMap.set(actorName, { name: actorName, characters: new Set() });
          }

          actorDataMap.get(actorName).characters.add({ movie: movieTitle, character: characterName });
        }
      }
    }

    // Find actors who played more than one Marvel character
    const actorsWithMultipleCharacters = [];
    for (const [actorName, actorInfo] of actorDataMap.entries()) {
      if (actorInfo.characters.size > 1) {
        actorsWithMultipleCharacters.push({ actorName, characters: [...actorInfo.characters] });
      }
    }

    const filteredActors = actorsWithMultipleCharacters.filter(actorInfo => actors.includes(actorInfo.actorName));

    return filteredActors;

  } catch (error) {
    console.error(error);
    throw new Error('Error finding actors with multiple Marvel characters');
  }
}


async function findCharactersWithMultipleActors(movies,actors) {
  try {
    const actorDataMap = new Map();

    for (const movieId of Object.values(movies)) {
      const movieDetails = await getMovieDetailsbyID(movieId);

      // Check if the 'cast' property exists in the response
      if (movieDetails.data && Array.isArray(movieDetails.data.cast)) {
        const cast = movieDetails.data.cast;

        // Update the actorDataMap with the actor and character data
        for (const actor of cast) {
          const actorName = actor.name;
          const characterName = (removeFromString(["(uncredited)","(voice)","(archive footage)"], actor.character)).toLowerCase();


          // Check if the character is already associated with an actor
          if (actorDataMap.has(characterName)) {
            // Character is already associated, check if it's a different actor
            if (!actorDataMap.get(characterName).includes(actorName)) {
              actorDataMap.get(characterName).push(actorName);
            }
          } else {
            // Character is not associated, create an entry with the actor
            actorDataMap.set(characterName, [actorName]);
          }

        }
      }
    }

    // Filter characters played by more than one actor
    const charactersWithMultipleActors = [];
    for (const [characterName, actors] of actorDataMap.entries()) {
      if (actors.length > 1) {
        charactersWithMultipleActors.push({ characterName, actors });
      }
    }

    // Filter characters and return only those from the 'actors' array
    const filteredCharactersWithMultipleActors = charactersWithMultipleActors.filter(entry =>
      entry.actors.some(actor => actors.includes(actor))
    );

    return filteredCharactersWithMultipleActors;
  } catch (error) {
    console.error(error);
    throw new Error('Error finding actors with multiple Marvel characters');
  }
}

// REST API for answering the question: Which Marvel movies did each actor play in?
app.get('/moviesPerActor', async (req, res) => {
  const actorNames = dataForQuestions.actors;
  try {
    // Fetch List
    const actorsData = await fetchActorsData(actorNames);

    res.json(actorsData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// REST API for answering the question: Who are the actors who played more than one Marvel character?
app.get('/actorsWithMultipleCharacters', async (req, res) => {
  try {
    // Fetch a list of Marvel actors that played multiple roles
    const actorsWithMultipleMarvelCharacters = await findActorsWithMultipleMarvelCharacters(dataForQuestions.movies,dataForQuestions.actors);
    res.json(actorsWithMultipleMarvelCharacters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// REST API for answering the question: There is roles (characters) that were played by more than one actor?
app.get('/charactersWithMultipleActors', async (req, res) => {
  try {
    const charactersWithMultipleActors = await findCharactersWithMultipleActors(dataForQuestions.movies,dataForQuestions.actors);
    res.json(charactersWithMultipleActors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
