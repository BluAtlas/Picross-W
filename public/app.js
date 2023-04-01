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
        boardTitle: ""
    },
    methods: {
        welcomeNameInput: function () {
            if (this.socket !== null) {
                if (this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        action: "join_room",
                        data: this.roomCode
                    }));
                    return;
                } else {
                    this.socket = null;
                }
            }
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
                switch (action) {
                    case 'new_board':
                        send_wasm("j", data);
                        this.showPicross();
                        setInterval(this.listenSocket, 5);
                        break;
                    case "new_room":
                        this.pageCounter += 1;
                        break;
                    case "join_room":
                        send_wasm("j", data);
                        this.showPicross();
                        setInterval(this.listenSocket, 5);
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
                        this.bevyOpacity = 0.5;
                        this.boardTitle = message.title;
                        this.socket.onclose = function () { };
                        this.socket.close();
                        send_wasm("u", data);
                        break;
                    default:
                        console.log("invalid websocket message received");
                        break;
                }
            }
            // on connection lost
            this.socket.onerror = (event) => {
                this.connectSocket();
            }

            this.socket.onopen = () => {
                var message = {
                    action: "join_room",
                    data: this.roomCode
                }

                this.socket.send(JSON.stringify(message));
            }
        },
        listenSocket: async function () {
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
        }
    },
    created: function () {
        console.log("App is loaded and ready.");
    }
})
