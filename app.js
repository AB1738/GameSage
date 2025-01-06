const express =require('express')
const app=express()
const session = require('express-session');
const path=require('path')
const axios=require('axios')
const ejsMate=require('ejs-mate')
const PORT=3000
require('dotenv').config()

app.set('view engine', 'ejs') 
app.engine('ejs',ejsMate)
app.set('views',path.join(__dirname,'views'))
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')))


const API_KEY=process.env.API_KEY
const CLIENT_ID=process.env.CLIENT_ID


app.use(session({
    secret: 'your-secret-key', // Make sure to use a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set 'secure: true' if using HTTPS
  }));

//   // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);  // Log the error to the console (optional, can be logged to a file)

//     // Check for different types of errors
//     if (err.status) {
//         return res.status(err.status).json({ message: err.message });
//     }

//     // If the error has no status, default to a 500 Internal Server Error
//     res.status(500).json({
//         message: 'Something went wrong! Please try again later.',
//         error: process.env.NODE_ENV === 'production' ? {} : err // Hide stack trace in production
//     });
// });



const getTwitchCreds=async()=>{
    const results=axios.post(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=43zt8xnc3upnpbb7i4m6d7nupeo27x&grant_type=client_credentials`)
    return results
}

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


const getGameInfo=async()=>{
    const data=await getTwitchCreds()
    const {access_token,token_type}=data.data
    try {
        const response = await axios.post(
            "https://api.igdb.com/v4/games",
            "fields age_ratings,aggregated_rating,aggregated_rating_count,alternative_names,artworks,bundles,category,checksum,collection,collections,cover,created_at,dlcs,expanded_games,expansions,external_games,first_release_date,follows,forks,franchise,franchises,game_engines,game_localizations,game_modes,genres,hypes,involved_companies,keywords,language_supports,multiplayer_modes,name,parent_game,platforms,player_perspectives,ports,rating,rating_count,release_dates,remakes,remasters,screenshots,similar_games,slug,standalone_expansions,status,storyline,summary,tags,themes,total_rating,total_rating_count,updated_at,url,version_parent,version_title,videos,websites;limit 100;",
            {
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


app.get('/',(req,res)=>{
    res.render('home')
})





const genreDetails = {
    action: {
      description: "Action games focus on physical challenges, including hand–eye coordination and reaction-time.",
      popularity: "Very High",
      exampleGames: "Uncharted, Assassin's Creed"
    },
    adventure: {
      description: "Adventure games are characterized by exploration and puzzle-solving.",
      popularity: "Medium",
      exampleGames: "The Legend of Zelda, Tomb Raider"
    },
    rolePlaying: {
      description: "Role-playing games (RPGs) allow players to assume the roles of characters in a fictional setting.",
      popularity: "High",
      exampleGames: "The Witcher, Skyrim"
    },
    // Add other genres here...
  };








app.get('/genres',async(req,res,next)=>{
    try{
        const genres=await getGameGenres(req) 
        res.render('genres',{genres,genreDetails})
    }
    catch(e){
        next(e)
    }

})
app.get('/genres/:genreId',async(req,res,next)=>{
    try{
        const {genreId}=req.params
        const game=await getGamesByGenre(genreId,req)
        const cover=await fetchGBGameCover(game.name)

        console.log(game)
        console.log('------------------------------------------')
        console.log(cover)
        res.render('game',{game,cover})
    }catch(e){
        next(e)
    }

})

app.use((req, res, next) => {
    res.status(404).redirect('/genres');
});

// General error handling middleware
app.use((err, req, res, next) => {
     console.error(err.stack); // Log the error stack
    const status = err.status || 500;
    const message = status === 500 ? 'Internal Server Error' : err.message;
    // res.status(status).render('error', { user: req.user,message });
});




app.listen(PORT,()=>{
    console.log(`listening on port ${PORT}`)
})