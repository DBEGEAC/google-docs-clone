const STORAGE_USERS = 'gdocs_users';
const STORAGE_DOCS = 'gdocs_docs';
const STORAGE_LOGGED_USER = 'gdocs_logged_user';

const $ = s => document.querySelector(s);
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

function initSampleData() {
  if (!localStorage.getItem(STORAGE_USERS)) {
    const users = [
      { id: 1, username: 'admin', password: 'admin123', role: 'admin', suspended: false },
      { id: 2, username: 'user1', password: 'user123', role: 'user', suspended: false },
      { id: 3, username: 'user2', password: 'user456', role: 'user', suspended: false }
    ];
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }
  if (!localStorage.getItem(STORAGE_DOCS)) {
    localStorage.setItem(STORAGE_DOCS, JSON.stringify([]));
  }
}

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS)) || [];
}

function getDocs() {
  return JSON.parse(localStorage.getItem(STORAGE_DOCS)) || [];
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function saveDocs(docs) {
  localStorage.setItem(STORAGE_DOCS, JSON.stringify(docs));
}

function getLoggedUser() {
  return JSON.parse(localStorage.getItem(STORAGE_LOGGED_USER));
}

function saveLoggedUser(user) {
  localStorage.setItem(STORAGE_LOGGED_USER, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(STORAGE_LOGGED_USER);
  window.location.reload();
}

async function loginPrompt() {
  return new Promise((resolve) => {
    const username = prompt('Enter username (admin, user1, user2):');
    const password = prompt('Enter password:');
    resolve({ username, password });
  });
}

function authenticate({ username, password }) {
  const users = getUsers();
  return users.find(u => u.username === username && u.password === password && !u.suspended) || null;
}

initSampleData();

let currentUser = getLoggedUser();

(async function main() {
  if (!currentUser) {
    const creds = await loginPrompt();
    const user = authenticate(creds);
    if (!user) {
      alert('Invalid credentials or suspended account. Reload page to try again.');
      return;
    }
    saveLoggedUser(user);
    currentUser = user;
  }

  $('#currentUser').textContent = `${currentUser.username} (${currentUser.role})`;
  if (currentUser.role === 'admin') {
    $('#adminPanel').style.display = 'block';
  }

  $('#logoutBtn').addEventListener('click', logout);

  const docsListEl = $('#documentsList');
  const editorEl = $('#editor');
  const toolbarEl = $('#toolbar');
  const collaboratorsListEl = $('#collaboratorsList');
  const searchUsersInput = $('#searchUsersInput');
  const activityPanel = $('#activityPanel');
  const messagesPanel = $('#messagesPanel');
  const msgInput = $('#msgInput');
  const sendMsgBtn = $('#sendMsgBtn');
  const btnNewDoc = $('#btnNewDoc');
  const userListEl = $('#userList');

  let documents = getDocs();
  let selectedDocId = null;
  let autoSaveTimer = null;

  function renderDocuments() {
    docsListEl.innerHTML = '';
    const filteredDocs = currentUser.role === 'admin' ?
      documents :
      documents.filter(d =>
        d.authorId === currentUser.id || (d.collaborators && d.collaborators.includes(currentUser.id))
      );

    if (filteredDocs.length === 0) {
      docsListEl.innerHTML = '<p>No documents found.</p>';
      editorEl.innerHTML = '<p class="text-muted">Select or create a document to start editing.</p>';
      return;
    }

    filteredDocs.forEach(doc => {
      const div = document.createElement('div');
      div.className = 'document-item' + (doc.id === selectedDocId ? ' active' : '');
      div.textContent = doc.title || 'Untitled Document';
      div.addEventListener('click', () => selectDocument(doc.id));
      docsListEl.appendChild(div);
    });
  }

  function selectDocument(docId) {
    if (selectedDocId === docId) return;
    selectedDocId = docId;

    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    editorEl.innerHTML = doc.content || '<p><br></p>';

    renderCollaborators(doc.collaborators || []);

    renderActivity(doc.activity || []);

    renderMessages(doc.messages || []);

    renderDocuments();

    if (currentUser.role === 'admin' && !doc.editors?.includes(currentUser.id)) {
      editorEl.contentEditable = false;
      editorEl.classList.add('bg-light');
    } else {
      editorEl.contentEditable = true;
      editorEl.classList.remove('bg-light');
    }
  }

  function renderCollaborators(collaboratorIds) {
    collaboratorsListEl.innerHTML = '';
    const users = getUsers();
    collaboratorIds.forEach(id => {
      const user = users.find(u => u.id === id);
      if (user) {
        const div = document.createElement('div');
        div.textContent = user.username;
        collaboratorsListEl.appendChild(div);
      }
    });
  }

  function renderActivity(activity) {
    activityPanel.innerHTML = '';
    activity.forEach(act => {
      const li = document.createElement('li');
      li.textContent = `${act.timestamp} - ${act.user}: ${act.action}`;
      activityPanel.appendChild(li);
    });
  }

  function renderMessages(messages) {
    messagesPanel.innerHTML = '';
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${msg.user}</strong>: ${msg.text} <small class="text-muted">${msg.timestamp}</small>`;
      messagesPanel.appendChild(div);
    });
    messagesPanel.scrollTop = messagesPanel.scrollHeight;
  }

  function saveDocumentContent() {
    if (!selectedDocId) return;
    const docIndex = documents.findIndex(d => d.id === selectedDocId);
    if (docIndex < 0) return;
    const doc = documents[docIndex];
    if (currentUser.role === 'admin' && !(doc.editors?.includes(currentUser.id) || doc.authorId === currentUser.id)) {
      return;
    }
    doc.content = editorEl.innerHTML;

    const timestamp = new Date().toLocaleString();
    doc.activity = doc.activity || [];
    doc.activity.push({ user: currentUser.username, action: 'Edited document', timestamp });

    documents[docIndex] = doc;
    saveDocs(documents);
    renderActivity(doc.activity);
  }

  editorEl.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveDocumentContent, 1000);
  });

  toolbarEl.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const cmd = btn.dataset.cmd;

    if (cmd === 'h1' || cmd === 'h2' || cmd === 'h3') {
      document.execCommand('formatBlock', false, cmd);
    } else if (cmd === 'insertImage') {
      const url = prompt('Enter image URL');
      if (url) document.execCommand('insertImage', false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
  });

  $('#btnInsertImage').addEventListener('click', () => {
    const url = prompt('Enter image URL');
    if (url) document.execCommand('insertImage', false, url);
  });

  btnNewDoc.addEventListener('click', () => {
    const title = prompt('Enter document title:') || 'Untitled Document';
    const newDoc = {
      id: Date.now(),
      title,
      authorId: currentUser.id,
      content: '<p><br></p>',
      collaborators: [],
      editors: [],
      activity: [],
      messages: []
    };
    documents.push(newDoc);
    saveDocs(documents);
    selectedDocId = newDoc.id;
    renderDocuments();
    selectDocument(newDoc.id);
  });

  function searchUsers(query) {
    query = query.toLowerCase();
    const users = getUsers();
    // exclude current user and existing collaborators
    if (!selectedDocId) return [];
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) return [];
    return users.filter(u =>
      u.username.toLowerCase().includes(query) &&
      u.id !== currentUser.id &&
      !doc.collaborators.includes(u.id)
    );
  }

  function renderUserSearchResults(results) {
    collaboratorsListEl.innerHTML = '';
    if (!selectedDocId) {
      collaboratorsListEl.textContent = 'Select a document first.';
      return;
    }
    results.forEach(user => {
      const div = document.createElement('div');
      div.className = 'user-item';
      div.textContent = user.username;
      div.addEventListener('click', () => {
        addCollaborator(user.id);
      });
      collaboratorsListEl.appendChild(div);
    });
  }

  function addCollaborator(userId) {
    const docIndex = documents.findIndex(d => d.id === selectedDocId);
    if (docIndex < 0) return;
    const doc = documents[docIndex];
    doc.collaborators = doc.collaborators || [];
    if (!doc.collaborators.includes(userId)) {
      doc.collaborators.push(userId);
      saveDocs(documents);
      renderCollaborators(doc.collaborators);

      const user = getUsers().find(u => u.id === userId);
      doc.activity = doc.activity || [];
      const timestamp = new Date().toLocaleString();
      doc.activity.push({ user: currentUser.username, action: `Added collaborator ${user.username}`, timestamp });
      saveDocs(documents);
      renderActivity(doc.activity);
    }
    searchUsersInput.value = '';
    collaboratorsListEl.innerHTML = '';
  }

  searchUsersInput.addEventListener('input', debounce(e => {
    const results = searchUsers(e.target.value);
    renderUserSearchResults(results);
  }, 300));

  sendMsgBtn.addEventListener('click', sendMessage);
  msgInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });

  function sendMessage() {
    if (!selectedDocId) return alert('Select a document first');
    const text = msgInput.value.trim();
    if (!text) return;
    const docIndex = documents.findIndex(d => d.id === selectedDocId);
    if (docIndex < 0) return;
    const doc = documents[docIndex];
    doc.messages = doc.messages || [];
    const timestamp = new Date().toLocaleTimeString();
    doc.messages.push({ user: currentUser.username, text, timestamp });
    saveDocs(documents);
    renderMessages(doc.messages);
    msgInput.value = '';
  }

  function renderAdminPanel() {
    if (currentUser.role !== 'admin') return;
    const users = getUsers();
    userListEl.innerHTML = '';
    users.forEach(user => {
      const div = document.createElement('div');
      div.className = 'd-flex justify-content-between align-items-center mb-1';
      div.innerHTML = `
        <span>${user.username} (${user.role})</span>
        <label class="form-check form-switch m-0">
          <input class="form-check-input" type="checkbox" data-userid="${user.id}" ${user.suspended ? 'checked' : ''} ${user.id === currentUser.id ? 'disabled' : ''}>
          <span>${user.suspended ? '<span class="suspended-label">Suspended</span>' : 'Active'}</span>
        </label>
      `;
      userListEl.appendChild(div);
    });

    userListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', e => {
        const userId = parseInt(e.target.dataset.userid);
        toggleUserSuspend(userId, e.target.checked);
      });
    });
  }

  function toggleUserSuspend(userId, suspend) {
    if (userId === currentUser.id) {
      alert("You can't suspend yourself.");
      renderAdminPanel();
      return;
    }
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    user.suspended = suspend;
    saveUsers(users);
    if (suspend && userId === currentUser.id) {
      logout();
    }
  }

  renderDocuments();
  renderAdminPanel();

const createUserForm = $('#createUserForm');
const newUsername = $('#newUsername');
const newPassword = $('#newPassword');
const newUserRole = $('#newUserRole');
const createUserMsg = $('#createUserMsg');

createUserForm?.addEventListener('submit', function (e) {
  e.preventDefault();
  const username = newUsername.value.trim();
  const password = newPassword.value.trim();
  const role = newUserRole.value;

  if (!username || !password) return;

  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    createUserMsg.textContent = 'Username already exists!';
    createUserMsg.classList.remove('text-success');
    createUserMsg.classList.add('text-danger');
    return;
  }

  const newUser = {
    id: Date.now(),
    username,
    password,
    role,
    suspended: false
  };

  users.push(newUser);
  saveUsers(users);
  renderAdminPanel();

  createUserForm.reset();
  createUserMsg.textContent = `User "${username}" created successfully!`;
  createUserMsg.classList.remove('text-danger');
  createUserMsg.classList.add('text-success');
});


  if (documents.length > 0) {
    selectDocument(documents[0].id);
  } else {
    editorEl.innerHTML = '<p class="text-muted">Create a new document to start editing.</p>';
  }
})();
