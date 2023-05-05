const express = require("express");
const app = express();

const {
    EventStoreDBClient,
    jsonEvent,
    FORWARDS,
    START,
    BACKWARDS,
    END,
    StreamNotFoundError,
  } = require("@eventstore/db-client");
const { v4: uuidv4 } = require('uuid');

const client = EventStoreDBClient.connectionString`esdb://localhost:2113?tls=false`;
const streamName = "Get started with EventStoreDB v7";
const eventType = "Task";
let tasksArray = [];


// Write new task to ESDB
function taskToEvent(name,status) {
    return new Promise(async(resolve,reject) => {
        let data = jsonEvent({
            type: eventType,
            data: {
                entityId: uuidv4(),
                status: status,
                name: name,
                date: new Date().toISOString(),
            }
        });
        await client.appendToStream(streamName, [data]);
        resolve();
    })
}

function getEvents(status) {
    return new Promise(async(resolve,reject) => {
        // Get events from stream, unique by name
        let eventsToRead = client.readStream(streamName, {
            fromRevision: START,
            direction: FORWARDS,
          });
        var events = [];
        try {
            for await (var resolvedEvent of eventsToRead) {
                if(events.filter(e => e.name === resolvedEvent.event?.data.name).length == 0) {
                    events.push(resolvedEvent.event?.data);
                } else {
                    events.find(e => e.name === resolvedEvent.event?.data.name).status = resolvedEvent.event?.data.status;
                }
            }
        } catch (error) {
            if (error instanceof StreamNotFoundError) {
                console.log("Stream not found");
                return;
            }
        }
        // Turn events in to tasks
        let tasks = [];
        for await (var taskEvent of events) {
            console.log(JSON.stringify(taskEvent, null, 4));
            if (status === "Removed") {
                if (
                    tasks.filter(e => e.name === taskEvent.name).length == 0
                    && taskEvent.name
                    && taskEvent.status === "Removed"
                ) {
                    let taskData = {
                    name: taskEvent.name,
                    status: taskEvent.status
                    }
                    tasks.push(taskData);
                } 
            } else {
                if (events.filter(function(e) {return e.name === taskEvent.name && e.status === "Removed"}).length > 0) {continue}
                if (
                    tasks.filter(e => e.name === taskEvent.name).length == 0
                    && taskEvent.name
                ) {
                    let taskData = {
                    name: taskEvent.name,
                    status: taskEvent.status
                    }
                    tasks.push(taskData);
                } else {
                    if(taskEvent.status == "Done" && taskEvent.name) {
                    tasks.find(task => task.name === taskEvent.name).status = taskEvent.status;
                    }
                }
            }            
        }
        //console.log(tasks)
        resolve(tasks);
    });
}

function eventsToTasks(tasks) {
    return new Promise(async(resolve,reject) => {
        tasksArray = [];
        for await (var task of tasks) {
            var checked = '';
            if(task.status === "Done"){
                checked = "checked";
            }
            let taskData = {
                "name": task.name,
                "id": task.name.replace(/\W/g,'_'),
                "status": task.status,
                "checked": checked
            }
            tasksArray.push(taskData);
            //console.log(tasksArray);
        }
        resolve();
    })
}

app.use("/static", express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.get('/', async(req, res, next) => {
    getEvents()
    .then((tasks) => eventsToTasks(tasks));
    setTimeout(function(){res.render('todo.ejs',{todoTasks: tasksArray, page: "home"})},500);
});

app.get('/removed', async(req, res, next) => {
    getEvents("Removed")
    .then((tasks) => eventsToTasks(tasks));
    setTimeout(function(){res.render('todo.ejs',{todoTasks: tasksArray, page: "removed"})},500);
});

app.post('/', async (req, res) => {
    try {
        taskToEvent(req.body.content, "To do")
        .then(function(){
            res.redirect("/");
        })        
    } catch (err) {
        res.redirect("/");
    }
});

app.post('/task-updated', async (req, res) => {
    try {
        taskToEvent(req.body.name, req.body.status)
        .then(function(){
            res.redirect("/");
        }) 
    } catch (err) {
        console.error("Failed");
    }
})

app.post('/task-removed', async (req, res) => {
    try {
        taskToEvent(req.body.name, "Removed")
        .then(function(){
            res.redirect("/");
        }) 
    } catch (err) {
        console.error("Failed");
    }
})

app.listen(3000, () => console.log("Server Up and running on port 3000"));