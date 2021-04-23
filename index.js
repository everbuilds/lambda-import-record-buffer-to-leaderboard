const mysql = require('mysql');
const pool  = mysql.createPool({
    multipleStatements: true,
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME, 
});

exports.handler = (event, context, callback) => {

    //prevent timeout from waiting event loop
    context.callbackWaitsForEmptyEventLoop = false;
  
    pool.getConnection((err, connection) => {
         if(err){
            console.log("FAILED TO CONNECT TO DB: "+ err);
            callback(null, {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json"
                },
                "body": JSON.stringify({
                    "message": "ops, error encountered: " + err
                })
            });
        } else {
            let query = `
                start transaction;
    
                replace into leaderboard(username, score, defeated)
                select 
                    b.username as username, 
                    coalesce(if(b.score < l.score, l.score, b.score),0)  as score ,
                    coalesce(b.defeated,0)+coalesce(l.defeated,0) as defeated 
                    
                from buffer b left join leaderboard l on b.username = l.username;
        
                delete from buffer;
        
                commit;`.replace(/\s+/g, ' ')
            
            connection.query(query, (error, results, fields) => {            
                if(error){
                    console.log("FAILED TO MIGRATE RECORDS FROM BUFFER TO LEADERBOARD: "+ error);
                    callback(null, {
                        "statusCode": 200,
                        "headers": {
                            "Content-Type": "application/json"
                        },
                        "body": JSON.stringify({
                            "message": "ops, error encountered: " + error
                        })
                    });
                } else {
                    console.log("SUCCESSFULLY MIGRATE RECORDS FROM BUFFER TO LEADERBOARD");
                    callback(null, {
                        "statusCode": 200,
                        "headers": {
                            "Content-Type": "application/json"
                        },
                        "body": JSON.stringify(results)
                    });
                }
            });
        }
    });
};