const axios=require('axios')
require('dotenv').config()
const { getTwitchCreds } = require('./getTwichCreds');
const API_KEY=process.env.API_KEY
const CLIENT_ID=process.env.CLIENT_ID
const CLIENT_SECRET=process.env.CLIENT_SECRET

//Take in the request object to check if there is an access token in the session
const getAccessToken = async (req) => {
    // If there's a token in the session and it's still valid, return it
    if (req.session.access_token && req.session.token_expiry_time > Date.now()) {
        console.log("Access token exists and is stil valid")
        return req.session.access_token;
    }

    // If no valid token in session, fetch a new one
    console.log('Fetching New Access Token')
    const data = await getTwitchCreds(); // Get Twitch credentials (API token)
    const { access_token, expires_in } = data.data;

    // Cache the token in the session
    req.session.access_token = access_token;
    req.session.token_expiry_time = Date.now() + (expires_in * 1000); // expires_in is in seconds

    return access_token;
};


//gets all video game genres
const getGameGenres=async(req)=>{


    try {
        const access_token = await getAccessToken(req); // Get cached or fresh token from session

        const response = await axios.post(
            "https://api.igdb.com/v4/genres",
            "fields *;limit 100;"   ,         {
                headers: {
                    'Accept': 'application/json',
                    'Client-ID': `${CLIENT_ID}`, // Replace with your actual Client ID
                    'Authorization': `Bearer ${access_token}` // Replace with your actual access token
                }
            }
        );

       return response.data; // Access the response data
    } catch (error) {
        console.error('Error fetching game data:', error);
    }

}    
const fetchGameParent=async(game,req)=>{
    try{
        if(game.parent_game){
            const access_token = await getAccessToken(req); // Get cached or fresh token from session
            console.log(access_token)
            const response = await axios.post(
                "https://api.igdb.com/v4/games",
                `fields *; where id = ${game.parent_game};`   ,         {
                    headers: {
                        'Accept': 'application/json',
                        'Client-ID': `${CLIENT_ID}`, // Replace with your actual Client ID
                        'Authorization': `Bearer ${access_token}` // Replace with your actual access token
                    }
                }
            );
            console.log('Parent game fetched')
            return response.data[0]
        }
    }catch(e){
        console.log('error in fetching game parent',e)
    }


}  

const getGamesByGenre = async (genreID,req) => {
    try {
        const access_token = await getAccessToken(req); // Get cached or fresh token from session
        console.log(access_token,'GET GAMES BY GENRE')

        const games = [];
        let offset = 0;
        const limit = 500; // Maximum limit per request

        // Loop through and fetch data with pagination
        while (true) {
            const response = await axios.post(
                "https://api.igdb.com/v4/games",
                `fields *; where genres = ${genreID}; limit ${limit}; offset ${offset};`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Client-ID': `${CLIENT_ID}`, // Replace with your actual Client ID
                        'Authorization': `Bearer ${access_token}`, // Authorization header with the token
                    }
                }
            );

            const data = response.data;

            if (data.length === 0) {
                break; // No more games to fetch
            }

            games.push(...data); // Add the current batch of games to the games list
            offset += limit; // Increment the offset to fetch the next batch
        }
        // console.log(games)
        // Randomly select a game from the fetched games
        if (games.length > 0) {
            const randomIndex = Math.floor(Math.random() * games.length);
            if(games[randomIndex].parent_game){
            return fetchGameParent(games[randomIndex],req)
            }
            else
            return games[randomIndex]; // Return a random game
        } else {
            console.log('No games found for this genre.');
            return null; // If no games were found
        }

    } catch (error) {
        console.error('Error fetching game data:', error);
        return null; // Return null in case of error
    }
};



const fetchGBGameCover=async(gameName)=>{
    try{
        const encodedGameName = encodeURIComponent(gameName);
        const response = await fetch(`https://www.giantbomb.com/api/search/?api_key=${API_KEY}&format=json&query=${encodedGameName}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const game = data.results[0];
            
            // Compare the game name with the requested game name
            if (game.name === gameName) {     
              return game.image.original_url;  // Return the image URL
            } else {
              return 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png';  // Handle name mismatch
            }
          } else {
            return 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png';  // If no results are found
          }
    }catch(e){
        console.error('Error fetching game cover data:', error);
        throw error; // Rethrow error for handling at a higher level
    } 

}

module.exports = {
    getGameGenres,
    getGamesByGenre,
    fetchGBGameCover,
  };