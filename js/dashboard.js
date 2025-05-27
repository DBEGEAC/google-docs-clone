document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  const container = document.getElementById('documentsList');
  const docs = JSON.parse(localStorage.getItem('documents')) || [];

  if (!user) {
    alert('Please login');
    window.location.href = 'login.html';
    return;
  }

  let userDocs = docs.filter(doc => doc.owner === user.username || (doc.sharedWith && doc.sharedWith.includes(user.username)));

  if (user.role === 'admin') {
    userDocs = docs;
  }

  if (userDocs.length === 0) {
    container.innerHTML = '<p>No documents found.</p>';
  } else {
    container.innerHTML = userDocs.map(doc => `
      <div class="document">
        <h3>${doc.title}</h3>
        <p>Last edited: ${doc.updated}</p>
        <button onclick="editDocument('${doc.id}')">Edit</button>
      </div>
    `).join('');
  }
});

function editDocument(id) {
  localStorage.setItem('activeDocument', id);
  window.location.href = 'editor.html';
}
