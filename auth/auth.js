const passport = require('passport');
const LocalStrategy = require("passport-local").Strategy;
const GitHubStrategy = require("passport-github").Strategy;
const ObjectID = require("mongodb").ObjectID;
const bcrypt = require("bcrypt");

module.exports = function(app, db) {
  
  passport.serializeUser((user, done) => {        //serialize user (user, done), return done(noError, userID)
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {      //desiralizeUser (id, done) return done(null, userDoc)           
    db.collection("users").findOne({ _id: new ObjectID(id) }, (err, doc) => { //call DB and find user by ObjectID(id)
      done(null, doc); //return noError, user data
    });
  });


  passport.use(new LocalStrategy((username, password, done)=>{
        db.collection("users").findOne({"email":username}, (err, doc)=>{
          if(!doc) return done(null, false, {message: "A user does not exist with that username"})
          if(!username) return done(null, false, {message: "No username supplies"});
          if(!password) return done(null, false, {message: "Wrong password"})
          else {
            if (!bcrypt.compareSync(password, doc.password)) return done(null, false, {message: "Wrong username or password"}); //if password hashes not equal, return NO ERRORS and AUTH FALSE
            else  { 
              console.log("User authenticated");
              return done(null, doc, {message: "Success!"}); //if all checks pass, return NO ERRORS and AUTH TRUE
            }
          }
        });
     }));

}