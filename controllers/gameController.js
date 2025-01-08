const {getGameGenres,getGamesByGenre,fetchGBGameCover}=require('../services/getGameInfo')
const genreDetails = require('../data/genreDetails'); 

exports.home=(req,res,next)=>{
    res.render('home')
}
exports.getGenres=async(req,res,next)=>{
    try{
        const genres=await getGameGenres(req) 
        res.render('genres',{genres,genreDetails})
    }
    catch(e){
        next(e)
    }
}

exports.getGame=async(req,res,next)=>{
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

}