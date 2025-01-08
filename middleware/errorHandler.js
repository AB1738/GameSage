const errorHandler=(err, req, res, next) => {
    console.error(err.stack); // Log the error stack
   const status = err.status || 500;
   const message = status === 500 ? 'Internal Server Error' : err.message;
   res.status(status).send('Internal Server Error');
};
module.exports=errorHandler;