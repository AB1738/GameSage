const axios=require('axios')
require('dotenv').config()
const CLIENT_ID=process.env.CLIENT_ID
const CLIENT_SECRET=process.env.CLIENT_SECRET

const getTwitchCreds=async()=>{
    try{
        const results=axios.post(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`)
        return results
    }catch(e){
        console.error('Error fetching Twitch credentials:', e);
        throw new Error('Failed to fetch Twitch credentials');
    }
}
module.exports={getTwitchCreds}