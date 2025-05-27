function formatText(command) {
  document.execCommand(command, false, null);
}

function insertImage() {
  const url = prompt("Enter Image URL:");
  if (url) {
    document.execCommand('insertImage', false, url);
  }
}

function saveDocuments(docs) {
  localStorage.setItem('documents', JSON.stringify(docs));
}
