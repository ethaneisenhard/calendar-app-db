var express = require("express");
var cors = require("cors");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var AWS = require("aws-sdk");
var app = express();
app.use(cors());
app.listen(3000, () => console.log("Calendar API listening on port 3000!"));
AWS.config.update({
  region: "eu-east-1",
  endpoint: "http://localhost:8000"
});
var docClient = new AWS.DynamoDB.DocumentClient();
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "jade");
app.get("/", function(req, res) {
  res.send({ title: "Calendar API Entry Point" });
});

//scan entire table of events
app.get("/calendar/:community/", function(req, res) {
  var url = req.url.split("/");
  //why is there spaces??
  console.log(url);
  var calendarName = url[url.length - 2];

  var params = {
    TableName: calendarName
  };

  console.log("Scanning Calendar table.");
  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error(
        "Unable to scan the table. Error JSON:",
        JSON.stringify(err, null, 2)
      );
    } else {
      // print all the movies
      console.log("Scan succeeded.");
      res.send(data.Items);
      // continue scanning if we have more movies, because
      // scan can retrieve a maximum of 1MB of data
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

//query for specific event in specific calendar
app.get("/calendar/:community/event/:id", function(req, res) {
  var url = req.url.split("/");
  var community = url[url.length - 3];
  var eventID = url[url.length - 1];

  var table = community;

  var params = {
    TableName: table,
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
    },
    ExpressionAttributeValues: {
      ":id": eventID
    }
  };
  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Query succeeded.");
      res.send(data.Items);
    }
  });
});

//add RSVP to specific event
app.patch("/calendar/:community/rsvpEvent", function(req, res) {
  var url = req.url.split("/");
  var community = url[url.length - 2];

  var id = req.body.id;
  var title = req.body.title;
  var fullName = req.body.fullName;
  var email = req.body.email;
  var guests = req.body.guests;
  var dateOfEvent = req.body.dateOfEvent;
  var latestRSVPList = req.body.rsvpList;
  var latestRSVPObj = req.body.rsvpOBJ;

  var list = []

  var newRsvpObject = {dateOfEvent, list};
  var newRsvpDetails = {fullName, email , guests}
  newRsvpObject.list.push(newRsvpDetails)
 
  if(latestRSVPList.length>0){
    var parseLatestRSVP = JSON.parse(latestRSVPList);
    parseLatestRSVP.push(newRsvpDetails)
    newRsvpObject.list = parseLatestRSVP
  }

  var dateRSVPObject = {}
  dateRSVPObject["d" + dateOfEvent] = newRsvpObject;

  if(latestRSVPObj.length>0){
    var parseLatestRSVPObj = JSON.parse(latestRSVPObj);
    parseLatestRSVPObj["d" + dateOfEvent] = newRsvpObject
    dateRSVPObject = parseLatestRSVPObj
  } 

  var params = {
    TableName: community,
    Key: {
      id: id
    },
    UpdateExpression: "set info.rsvp = :r",
    ExpressionAttributeValues: {
      ":r": dateRSVPObject
    },
    ReturnValues: "UPDATED_NEW"
  };

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
    if (err) {
      console.error(
        "Unable to update item. Error JSON:",
        JSON.stringify(err, null, 2)
      );
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
    }
  });
});

//update event
app.patch("/calendar/:community/updateEvent/", function(req, res) {
  var url = req.url.split("/");
  var community = url[url.length - 2];

  var id = req.body.id;
  var title = req.body.title;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var ogStartDate = req.body.ogStartDate;
  var ogEndDate = req.body.ogEndDate;
  var eventLocation = req.body.eventLocation;
  var description = req.body.description;

  console.log(ogStartDate)
  console.log(ogEndDate)
  
  var params = {
    TableName: community,
    Key: {
      id: id
    },
    UpdateExpression: "set title = :t, info.dailyEquation.ogStartDate = :ogs, info.dailyEquation.ogEndDate = :oge, info.eventLocation = :l, info.description = :d, info.startDate = :s, info.endDate = :e",
    ExpressionAttributeValues: {
      ":t": title, 
      ":s": startDate, 
      ":e": endDate,
      ":ogs": ogStartDate, 
      ":oge": ogEndDate, 
      ":l": eventLocation, 
      ":d": description
    },
    ReturnValues: "UPDATED_NEW"
  };

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
    if (err) {
      console.error(
        "Unable to update item. Error JSON:",
        JSON.stringify(err, null, 2)
      );
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
    }
  });
});

//create event to a specific calendar
app.post("/calendar/:community/addEvent", function(req, res) {
  var url = req.url.split("/");
  var community = url[url.length - 2];

  console.log("Community Table " + community)

  var id = req.body.id;
  var title = req.body.title;
  // var heroImage = req.body.heroImage;
  var eventLocation = req.body.eventLocation;
  var dailyActivity = req.body.dailyActivity;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var description = req.body.description;
  var availableSpots = req.body.availableSpots;
  var repeats = req.body.repeats;
  var every = req.body.every;
  var daysOfWeek = req.body.daysOfWeek;
  var monthsOfYear = req.body.monthsOfYear;
  var daysOfMonth = req.body.daysOfMonth;
  var dayNumber = req.body.dayNumber;
  var dayType = req.body.dayType;
  var ogStartDate = req.body.ogStartDate;
  var ogEndDate = req.body.ogEndDate;

  var params = {
    TableName: community,
    Item: {
      id: id,
      title: title,
      info: {
        // heroImage: heroImage, 
        eventLocation: eventLocation,
        dailyActivity: dailyActivity,
        startDate: startDate,
        endDate: endDate,
        description: description,
        availableSpots: availableSpots,
        dailyEquation: {
          repeats: repeats,
          every: every,
          daysOfWeek: daysOfWeek,
          daysOfMonth: daysOfMonth,
          monthsOfYear: monthsOfYear,
          dayNumber: dayNumber,
          dayType: dayType,
          ogStartDate: ogStartDate,
          ogEndDate: ogEndDate, 
        }
      }
    }
  };

  console.log("Adding a new item...");
  docClient.put(params, function(err, data) {
    if (err) {
      console.error(
        "Unable to add item. Error JSON:",
        JSON.stringify(err, null, 2)
      );
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
    }
  });
});

//delete event from a specific calendar
app.delete("/calendar/:community/deleteEvent", function(req, res) {
  var url = req.url.split("/");
  var community = url[url.length - 2];

  var id = req.body.id;

  var params = {
    TableName: community,
    Key:{
        "id": id
    }
  };

  console.log("Attempting a conditional delete...");
  docClient.delete(params, function(err, data) {
      if (err) {
          console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
      }
  });

});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
