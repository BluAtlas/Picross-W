
const ROOM_UPDATE_INTERVAL = 250; // Delay to refresh clients in milliseconds

const express = require('express')
const WebSocket = require('ws')
const cors = require('cors')
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const app = express()
const port = process.env.PORT || 8080

app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(cors())

var server = app.listen(port, () => {
    console.log(`Server live on port: ${port}`)
})

const wss = new WebSocket.Server({ server });

const ROOM_MAP = new Map();     // ROOM_CODE -> ROOM = [BOARD, CELLS, [CLIENTS]]
const CLIENT_MAP = new Map();   // CLIENT_UUID -> ROOM_CODE


wss.on('connection', function connection(client) {
    console.log("Connection created")

    client.uuid = uuid();

    client.on('message', (event) => {
        let message = JSON.parse(event)
        let data = message.data;
        let action = message.action;
        if (action) {
            if (action == "join_room") {
                let room_code = data;
                if (ROOM_MAP.has(room_code)) { // join existing room
                    console.log("Joining room:", room_code);

                    let room = ROOM_MAP.get(room_code);
                    room.clients.push(client.uuid);

                    let response = {
                        action: "join_room",
                        data: room.board + "SPLIT" + room.cells
                    }
                    client.send(JSON.stringify(response));

                } else { // create new room
                    console.log("Creating room:", room_code);

                    const room = { board: "", goal: "", cells: [], clients: [client.uuid] };
                    ROOM_MAP.set(room_code, room);

                    let response = {
                        action: "new_room"
                    }
                    client.send(JSON.stringify(response));
                }
                // whether joining or creating room, assign client_map room code
                CLIENT_MAP.set(client.uuid, room_code);

            } else if (action == "cell_update") {
                let room_code = CLIENT_MAP.get(client.uuid);
                let room = ROOM_MAP.get(room_code);

                let values = data.split(",");
                let index = parseInt(values[0]);

                room.cells[index] = values[1];
            } else if (action == "difficulty_selection") {
                let board_len;
                let room_code = CLIENT_MAP.get(client.uuid);
                let room = ROOM_MAP.get(room_code);

                switch (data) {
                    case "e": {
                        let x = getRandomBoard("easy");
                        room.board = x[0];
                        room.goal = x[1];
                        board_len = 25;
                        break;
                    }
                    case "n": {
                        let x = getRandomBoard("normal");
                        room.board = x[0];
                        room.goal = x[1];
                        board_len = 100;
                        break;
                    }
                    case "h": {
                        let x = getRandomBoard("hard");
                        room.board = x[0];
                        room.goal = x[1];
                        board_len = 225;
                        break;
                    }
                    default: {
                        console.log("Invalid Difficulty: ", data);
                        let x = getRandomBoard("normal");
                        room.board = x[0];
                        room.goal = x[1];
                        board_len = 100;
                        board_len = 100;
                        break;
                    }
                }

                for (let i = 0; i < board_len; i++) {
                    room.cells.push("0");
                }

                let response = {
                    action: 'new_board',
                    data: room.board + "SPLIT" + room.cells.join("")
                }

                console.log("Serving room: ", room_code)

                client.send(JSON.stringify(response));

                // serve clients
                let x = setInterval(function () { serveRoom(room_code, x) }, ROOM_UPDATE_INTERVAL)
            }
        } else {
            console.log("Invalid client message, No action");
        }
    })

    client.on('close', (event) => { clearClient(client); })
    client.on('error', (event) => { clearClient(client); })

})

function serveRoom(room_code, x) {
    let room = ROOM_MAP.get(room_code);
    if (room !== undefined) {
        let response = {
            action: "board_update",
            data: room.cells.join("")
        }
        if (!checkBoardGoal(room.cells.join(""), room.goal)) {
            for (let i = 0; i < room.clients.length; i++) {
                let client_uuid = room.clients[i];
                wss.clients.forEach((client) => {
                    if (client.uuid == client_uuid) {
                        client.send(JSON.stringify(response));
                    }
                })
            }
        } else { // room goal met
            response = {
                action: "board_complete",
                data: room.cells.join("")
            }
            console.log("Room wins:", room_code);
            for (let i = 0; i < room.clients.length; i++) {
                let client_uuid = room.clients[i];
                wss.clients.forEach((client) => {
                    if (client.uuid == client_uuid) {
                        client.send(JSON.stringify(response));
                    }
                })
            }
            clearInterval(x);
        };
    } else {
        clearInterval(x);
        console.log("Room cleared:", room_code);
    }
}

function clearClient(client) {
    if (CLIENT_MAP.has(client.uuid)) {
        room_code = CLIENT_MAP.get(client.uuid);
        console.log("Client disconnected from room:", room_code)
        room = ROOM_MAP.get(room_code);
        let new_room = { board: room.board, cells: room.cells, clients: room.clients.filter(e => e !== client.uuid) };
        if (new_room.clients.length > 0) {
            ROOM_MAP.set(room_code, new_room);
        } else {
            ROOM_MAP.delete(room_code);
            console.log("Room deleted:", room_code)
        }
        CLIENT_MAP.delete(client.uuid);
    }
    client = null;
}

function getRandomBoard(difficulty) {
    let files = fs.readdirSync(path.join(process.cwd(), "./picross_boards/" + difficulty + "/"));

    let max = files.length - 1;
    let min = 0;

    let index = Math.round(Math.random() * (max - min) + min);
    let file = files[index];

    return [fs.readFileSync("./picross_boards/" + difficulty + "/" + file).toString('utf-8'),
    fs.readFileSync("./picross_boards/" + difficulty + "_goals/" + file + ".goal").toString('utf-8')];
}

function checkBoardGoal(cells, goal) {
    let result = true;
    for (let i = 0; i < cells.length; i++) {
        if ((cells[i] == "0" || cells[i] == "X") && (goal[i] == "0" || goal[i] == "X")) {
        } else if (cells[i] == "1" && goal[i] == "1") {
        } else {
            result = false;
            break;
        }
    }
    return result;
}