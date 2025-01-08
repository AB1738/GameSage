const express =require('express')
const app=express()
const session = require('express-session');
const path=require('path')
const axios=require('axios')
const ejsMate=require('ejs-mate')
const PORT=3000
require('dotenv').config()

const sessionMiddleware = require('./middleware/sessionMiddleware'); 
const errorHandler=require('./middleware/errorHandler')
const { getTwitchCreds } = require('./services/getTwichCreds');
const {getGameGenres,getGamesByGenre,fetchGBGameCover}=require('./services/getGameInfo')
const games=require('./controllers/gameController')


app.set('view engine', 'ejs') 
app.engine('ejs',ejsMate)
app.set('views',path.join(__dirname,'views'))
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')))
app.use(sessionMiddleware)

app.get('/',games.home)
app.get('/genres',games.getGenres)
app.get('/genres/:genreId',games.getGame)


app.use((req, res, next) => {
    res.status(404).redirect('/genres');
});

//Error handling middleware
app.use(errorHandler);


app.listen(PORT,()=>{
    console.log(`listening on port ${PORT}`)
})