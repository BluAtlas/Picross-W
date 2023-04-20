import init, { send_wasm, recv_wasm } from "./out/picross_w.js";
init();

//const WS_ROOT = "ws://localhost:8080";
const WS_ROOT = "wss://picross-w.onrender.com";

var app = new Vue({
    el: '#app',
    data: {
        socket: null,
        pageCounter: 1,
        canvasWidth: "1px",
        bevyZIndex: -1,
        bevyOpacity: 0.2,
        roomCode: "",
        pendingUpdates: 0,
        boardTitle: "",
        connectionError: false,
    },
    methods: {
        welcomeNameInput: function () {
            this.pageCounter = 4;
            this.connectSocket();
        },
        easyRandom: function () {
            this.startGame("e");
        },
        normalRandom: function () {
            this.startGame("n");
        },
        hardRandom: function () {
            this.startGame("h");
        },
        startGame: function (difficulty_string) {
            var message = {
                action: "difficulty_selection",
                data: difficulty_string
            }
            this.socket.send(JSON.stringify(message));
        },
        showPicross: function () {
            this.pageCounter = 0;
            this.bevyZIndex = 0;
            this.bevyOpacity = 1;
        },
        showMenu: function () {
            this.pageCounter = 1;
            this.bevyZIndex = -1;
            this.bevyOpacity = 0.2;
        },
        connectSocket: function () {
            // create websocket
            this.socket = new WebSocket(WS_ROOT);

            // on message from websocket
            this.socket.onmessage = (event) => {
                var message = JSON.parse(event.data);
                var action = message.action;
                var data = message.data;
                let x = null;
                switch (action) {
                    case 'new_board':
                        send_wasm("j", data);
                        this.showPicross();
                        x = setInterval(() => { this.listenSocket(x) }, 5);
                        break;
                    case "new_room":
                        this.pageCounter = 2;
                        break;
                    case "join_room":
                        send_wasm("j", data);
                        this.showPicross();
                        x = setInterval(() => { this.listenSocket(x) }, 5);
                        break;
                    case "board_update":
                        this.pendingUpdates -= message.updates;
                        if (this.pendingUpdates == 0) {
                            send_wasm("u", data);
                        }
                        break;
                    case "board_complete":
                        this.pageCounter = 3;
                        this.bevyZIndex = -1;
                        this.bevyOpacity = 0.7;
                        this.boardTitle = message.title;
                        this.pendingUpdates = 0;
                        this.socket.onclose = function () { };
                        this.socket.close();
                        this.socket = null;
                        send_wasm("u", data);
                        break;
                    default:
                        console.log("invalid websocket message received");
                        break;
                }
            }
            // on connection lost
            this.socket.onerror = (event) => {
                this.connectionError = true;
                console.log("Reconnecting after Websocket Error:", event)
                this.connectSocket();
            }

            this.socket.onclose = (event) => {
                this.connectionError = true;
                console.log("Reconnecting after Websocket closure:", event)
                this.connectSocket();
            }

            this.socket.onopen = () => {
                this.connectionError = false;
                var message = {
                    action: "join_room",
                    data: this.roomCode
                }
                this.socket.send(JSON.stringify(message));
            }
        },
        listenSocket: async function (x) {
            if (this.socket !== null) {
                var string = recv_wasm();
                if (string != "") {
                    var strings = string.split("SPLIT");
                    var command = strings[0];
                    var data = strings[1];
                    switch (command) {
                        case "c":
                            // send cell update websocket
                            this.pendingUpdates += 1;
                            var message = {
                                action: "cell_update",
                                data: data
                            }
                            this.socket.send(JSON.stringify(message));
                            break;
                        default:
                            break;
                    }
                }
            } else {
                clearInterval(x);
            }
        }
    },
    created: function () {
        console.log("App is loaded and ready.");
    }
})
