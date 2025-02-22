function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function parseMessage(str) {
    const safeStr = escapeHTML(str);
    const parsed = marked.parse(safeStr);
    return DOMPurify.sanitize(parsed);
}

function ge(id) {
    return document.getElementById(id);
}

let messages = [];
let users = [
    {
        username: "Pixelit",
        pfp: "/img/blooks/logo.png",
        badges: ["/img/blooks/logo.png", "e"]
    },
];

let username, pfp, badges;

fetch("/user")
    .then((response) => {
        if (!response.ok) {
            throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json();
    })
    .then((data) => {
        username = data.username;
        pfp = data.pfp;
        badges = data.badges;
    })
    .catch((e) => {
        console.error(e);
    });

function createMessageHTML(message) {
    const username = escapeHTML(message.sender);
    const badgesHTML = (message.badges || []).map(
        badge => `<img src="${escapeHTML(badge.image)}" draggable="false" class="badge" />`
    ).join("");

    return `
        <div class="message">
            <div class="pfp">
                <img
                    src="/img/blooks/${escapeHTML(message.pfp)}"
                    draggable="false"
                    style="filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5))"
                    onerror="this.src='/img/blooks/logo.png';"
                />
            </div>
            <div class="messageContainer">
                <div class="usernameAndBadges">
                    <div class="username">${username}</div>
                    <div class="badges">${badgesHTML}</div>
                </div>
                <div class="messageText">${parseMessage(message.msg)}</div>
            </div>
        </div>
    `;
}

function updateMessages(messages) {
    const messagesContainer = ge("chatContainer");
    const fragment = document.createDocumentFragment();

    messages.forEach(message => {
        const messageHTML = document.createElement('div');
        messageHTML.innerHTML = createMessageHTML(message);
        fragment.appendChild(messageHTML);
    });

    messagesContainer.innerHTML = "";
    messagesContainer.appendChild(fragment);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

const byte = (str) => new Blob([str]).size;

document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    console.log("Chat has been successfully loaded!");

    ge("send").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const msg = e.target.value.trim();
            if (msg === "") {
                e.target.value = "";
                return;
            }
            if (byte(msg) > 1000) {
                alert("Message is too long!");
                e.target.value = "";
                return;
            }
            const chatMessage = { sender: username, msg, badges, pfp };
            messages.push(chatMessage);
            updateMessages(messages);
            socket.emit("message", msg);
            e.target.value = "";
        }
    });

    socket.emit("getChat");

    socket.on("chatupdate", (data) => {
        if (data === "get") {
            socket.emit("getChat");
            return;
        }

        const existingMessagesSet = new Set(messages.map(msg => msg._id));

        if (JSON.stringify(data) !== JSON.stringify(messages)) {
            data = data.filter(msg => !existingMessagesSet.has(msg._id));
            messages = messages.concat(data);
            updateMessages(messages);
        }
    });

    fetch('/user')
        .then(response => response.json())
        .then(data => {
            const userRole = data.role;
            const allowedRoles = ['Owner', 'Admin', 'Moderator', 'Helper'];
            if (allowedRoles.includes(userRole)) {
                document.getElementById('wrench-icon').style.display = 'inline';
            }
        })
        .catch(error => {
            console.error('Error fetching user role:', error);
        });

    socket.on("error", (e) => {
        alert(e)
    })
});

function logout() {
  fetch('/logout', { method: 'POST' })
    .then(response => {
      if (response.ok) {
        sessionStorage.clear();
        localStorage.removeItem('loggedIn');
        window.location.href = '/index.html';
      } else {
        console.error('Logout failed');
      }
    })
    .catch(error => console.error('Error:', error));
}