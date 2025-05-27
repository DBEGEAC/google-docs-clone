document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');
  const messages = document.getElementById('messages');
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  const docId = localStorage.getItem('activeDocument');

  let docs = JSON.parse(localStorage.getItem('documents')) || [];
  let doc = docs.find(d => d.id === docId);

  if (!doc) {
    doc = {
      id: Date.now().toString(),
      title: "Untitled",
      content: "",
      owner: user.username,
      sharedWith: [],
      logs: [],
      messages: [],
      updated: new Date().toISOString()
    };
    docs.push(doc);
    localStorage.setItem('activeDocument', doc.id);
  }

  editor.innerHTML = doc.content;
  renderMessages(doc.messages);
  renderLogs(doc.logs);

  editor.addEventListener('input', () => {
    doc.content = editor.innerHTML;
    doc.updated = new Date().toISOString();
    doc.logs.push({ user: user.username, action: 'Edited document', time: doc.updated });
    saveDocuments(docs);
    renderLogs(doc.logs);
  });
});

function renderMessages(messages) {
  const container = document.getElementById('messages');
  container.innerHTML = messages.map(m =>
    `<p><strong>${m.user}:</strong> ${m.message} <small>${m.time}</small></p>`
  ).join('');
}

function renderLogs(logs) {
  const logContainer = document.getElementById('logs');
  logContainer.innerHTML = logs.map(l =>
    `<li><strong>${l.user}</strong> ${l.action} at ${new Date(l.time).toLocaleString()}</li>`
  ).join('');
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value;
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  const docId = localStorage.getItem('activeDocument');

  let docs = JSON.parse(localStorage.getItem('documents'));
  let doc = docs.find(d => d.id === docId);
  const time = new Date().toISOString();
  doc.messages.push({ user: user.username, message, time });
  saveDocuments(docs);
  input.value = '';
  renderMessages(doc.messages);
}
