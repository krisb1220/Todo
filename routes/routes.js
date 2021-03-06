const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const passport = require('passport');
const Schemas = require("../database/schemas/schema");
const UserModel = Schemas.UserModel;
const pug = require("pug");
const getRandomColor = require("../utils/GetRandomColor").data
let makeNewUser = function (db, req, res, pw, email, first, last) {
  let userData = {
    first: first,
    last: last,
    email: email,
    password: bcrypt.hashSync(pw, 13, (err, hash) => {
      if (err) console.error(err)
      else return hash;
    }),
    data: new Schemas.ToDoMasterInstance
  }

  let newUser = new UserModel(userData);
  newUser.save((err, data) => {
    if (err) console.error(err);
    else console.log(`User ${first} ${last}  saved`);
    res.json({error: "Success!"})
  })
}

let ensureAuthenticated = function (redirect) {
    return (req, res, next)=>{
      if (req.isAuthenticated()) {
        next()
    } else {
      res.redirect(redirect)
    }
  }
}

let ensureIsntAuthenticated = function (redirect) {
  return (req, res, next)=>{
    if (!req.isAuthenticated()) {
      next()
    } else {
      res.redirect(redirect)
   }
}
}

let updateUserInner = async function (email, nestedObjectsArray, data) {
  let doc = await UserModel.findOneAndUpdate({ "email": email }, {
    $set: {
      [nestedObjectsArray.join(".")]: data
    }
  }, { upsert: true, useFindAndModify: false })
}

let doesntExist = async function(email, array, cbTrue, cbFalse) {
  let result = await UserModel.findOne({ "email": email }, async (err, doc)=>{
    let query = array.join(".");
    if(doc.query == undefined) {
      cbTrue();
    } else {
      if(!cbFalse) return undefined;
      if(cbFalse) cbFalse(); 
    }
});

return result;
}

let doRegistrationFormValidation = function(req, res){
    let result = true;

    if(req.body.email == '') {
      res.json({error: "No email supplied"})
      result = false;
    }

    else if(req.body.firstName == '') {
      res.json({error: "No first name supplied"})
      result = false;
    }

    else if(req.body.lastName == '') {
      res.json({error: "No last name supplied"})
      result = false;
    }

    else if(req.body.password == '') {
      res.json({error: "No password supplied"})
      result = false;
    }

    return result
}

let buildTagsArray = function(req, res) {
  let tagsArray = [];

  req.body.tags.forEach((tagName)=>{
    tagsArray.push(req.user.data.tags.tags[tagName.toLocaleLowerCase()]);
  })

  return tagsArray;

}


let addNewTask = function(req, res){
  if (req.body.title == ' ') res.json({ error: "No title provided" });
  if (req.body.description == '') res.json({ error: "No description provided" });
  if (req.body.date == '') res.json({ error: "No date provided" })
  else {
    res.json({ error: "Success!" });
    req.body.tags = buildTagsArray(req, res);
    console.log(req.body);
    let ToDo =  new Schemas.ToDoInstance(req.body);
    updateUserInner(req.user.email, ["data", "tasks", `${req.body.date}`, `${ToDo.ObjectID}`], ToDo);
    updateUserInner(req.user.email, ["data", "tasks", `${req.body.date}`, `meta`], {
      date: req.body.date
    });
  }
}

let addNewTag = function(req, res){
  console.log(req.body)
  let tagObject = req.body; 
  if (tagObject.color == '#000000') tagObject.color = getRandomColor();
  if (tagObject.name == '') res.json({error: "No tag provided"});
  if (req.user.data.tags.tags[tagObject.name.toLocaleLowerCase()] != undefined ) res.json({error: "Tag already exists"});
  else {
    updateUserInner(req.user.email, ["data", "tags", "tags", `${tagObject.name.toLocaleLowerCase()}`], tagObject)
    res.json({error: "Success!"})
  } 
} 

/*==========================================================================
                                                                      # ROUTES #
===========================================================================*/

module.exports = function (app, db) {

  app.route("/").get(ensureIsntAuthenticated("/profile"), (req, res) => {
    res.render(process.cwd() + "/routes/pug/index");
  })

  app.route("/login").post(passport.authenticate('local', {successRedirect:"/profile"}))

    // if(req.isAuthenticated()) {
    //   res.json({ error: "Success!" })
    // }
    // else if(!req.isAuthenticated()) {
    //   res.json({error: "Wrong username or password"})
    // }
  // }
  // );

  app.route("/register").post(async (req, res) => {
      if (!doRegistrationFormValidation(req, res)) {
        console.log("A registration error occured")
      } else {
      UserModel.findOne({email: req.body.email}, (err, doc) => {
        if (!doc) makeNewUser(db, req, res, req.body.password, req.body.email, req.body.firstName, req.body.lastName);
        else res.json({error: "A user already exists with this email"});
      });
    }
  });




  app.route("/getUserData").get(ensureAuthenticated, (req, res) => {
    res.json(req.user.data);
  })

  app.route("/profile").get(ensureAuthenticated("/"), (req, res) => {
    console.log(req.user.tasks)
    res.render(process.cwd() + "/routes/pug/profile", { user: req.user, tags: req.user.data.tags.tags });
  });

  app.route("/updateUser").post((req, res) => {
    if (req.query.action == "newtask") {
      console.log("posted");
      addNewTask(req, res);
    }
    if(req.query.action == "newtag") {
      addNewTag(req, res);
    }
  })


  app.route("/logout").get((req, res)=>{
    req.logout();
    res.redirect("/")
  })

}